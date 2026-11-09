#!/usr/bin/env python3
"""Utilitas RDF/XML deterministik untuk pipeline KB.

Serializer ini sengaja menulis RDF/XML secara manual dari triple yang sudah
diurutkan. Serializer bawaan rdflib mengurutkan subjek berdasarkan iterasi
graph yang tidak stabil, sehingga hash berkas bisa berubah antar-run.
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from xml.sax.saxutils import escape

import rdflib
from rdflib import BNode, Literal, URIRef
from rdflib.namespace import OWL, RDF, RDFS


def format_berkas(path: Path) -> str:
    """Tentukan format rdflib dari ekstensi."""
    return "xml" if path.suffix.lower() == ".rdf" else "turtle"


def baca_berkas(path: Path) -> rdflib.Graph:
    g = rdflib.Graph()
    g.parse(path, format=format_berkas(path))
    return g


def baca_turtle(teks: str) -> rdflib.Graph:
    g = rdflib.Graph()
    g.parse(data=teks, format="turtle")
    return g


def _split_iri(iri: str) -> tuple[str, str]:
    for sep in ("#", "/"):
        if sep in iri:
            ns, local = iri.rsplit(sep, 1)
            return ns + sep, local
    return iri, ""


def _esc(value: str) -> str:
    return escape(value, {'"': "&quot;"})


def serialize_kanonik(g: rdflib.Graph, header: str | None = None) -> str:
    """Serialisasi RDF/XML ground triples dengan urutan yang stabil."""
    triples = list(g)
    if any(isinstance(s, BNode) or isinstance(o, BNode) for s, _, o in triples):
        raise ValueError("serializer deterministik ini hanya mendukung ground triples")

    ns_map: dict[str, str] = {}
    for prefix, ns in g.namespaces():
        if prefix and str(ns) not in ns_map:
            ns_map[str(ns)] = prefix
    # Pastikan rdf selalu tersedia.
    ns_map.setdefault(str(RDF), "rdf")

    # Pastikan semua namespace predikat punya prefix.
    for _, pred, _ in triples:
        ns, _ = _split_iri(str(pred))
        if ns not in ns_map:
            ns_map[ns] = f"ns{len(ns_map)}"

    def qname(iri: str) -> str:
        ns, local = _split_iri(iri)
        prefix = ns_map[ns]
        return f"{prefix}:{local}" if prefix else local

    baris = ['<?xml version="1.0" encoding="utf-8"?>']
    if header:
        baris.append("<!-- " + header.replace("--", "- -") + " -->")

    deklarasi = " ".join(
        f'xmlns:{prefix}="{_esc(ns)}"'
        for ns, prefix in sorted(ns_map.items(), key=lambda item: item[1])
    )
    baris.append(f"<rdf:RDF {deklarasi}>")

    per_subjek: dict[URIRef, list[tuple[URIRef, object]]] = defaultdict(list)
    for subjek, pred, obj in triples:
        per_subjek[subjek].append((pred, obj))

    for subjek in sorted(per_subjek, key=str):
        baris.append(f'  <rdf:Description rdf:about="{_esc(str(subjek))}">')
        per_pred: dict[URIRef, list[object]] = defaultdict(list)
        for pred, obj in per_subjek[subjek]:
            per_pred[pred].append(obj)
        for pred in sorted(per_pred, key=str):
            qn = qname(str(pred))
            for obj in sorted(per_pred[pred], key=lambda item: (not isinstance(item, Literal), str(item))):
                if isinstance(obj, URIRef):
                    baris.append(f'    <{qn} rdf:resource="{_esc(str(obj))}"/>')
                elif isinstance(obj, Literal):
                    atribut = ""
                    if obj.datatype:
                        atribut += f' rdf:datatype="{_esc(str(obj.datatype))}"'
                    elif obj.language:
                        atribut += f' xml:lang="{_esc(obj.language)}"'
                    baris.append(f"    <{qn}{atribut}>{escape(str(obj))}</{qn}>")
                else:
                    raise ValueError(f"objek tidak didukung: {obj!r}")
        baris.append("  </rdf:Description>")
    baris.append("</rdf:RDF>")
    return "\n".join(baris) + "\n"


def tulis_rdfxml(path: Path, g: rdflib.Graph, header: str | None = None) -> None:
    path.write_text(serialize_kanonik(g, header), encoding="utf-8")


def header_generate(sumber: str, skrip: str = "build_ontology.py") -> str:
    return (
        "BERKAS DIGENERATE. JANGAN EDIT MANUAL.\n"
        f"     Sumber   : {sumber}\n"
        f"     Hasilkan : uv run python scripts/{skrip}"
    )


def graph_toplevel(iri: str, judul: str, imports: list[str]) -> rdflib.Graph:
    g = rdflib.Graph()
    g.bind("owl", OWL, replace=True)
    g.bind("rdfs", RDFS, replace=True)
    g.bind("dct", rdflib.Namespace("http://purl.org/dc/terms/"), replace=True)
    onto = rdflib.URIRef(iri)
    g.add((onto, RDF.type, OWL.Ontology))
    g.add((onto, rdflib.Namespace("http://purl.org/dc/terms/").title, rdflib.Literal(judul)))
    for item in imports:
        g.add((onto, OWL.imports, rdflib.URIRef(item)))
    return g
