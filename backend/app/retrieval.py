"""Retrieval: daftar ketentuan per topik lewat SPARQL (tanpa reasoner)."""

from __future__ import annotations

from rdflib import Namespace
from rdflib.namespace import OWL, RDF

from .ontology import graph

KTN = Namespace("https://example.org/kbr/ketenagakerjaan#")

_QUERY = """
PREFIX ktn:  <https://example.org/kbr/ketenagakerjaan#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
SELECT ?topik ?jenis ?pasal ?norma WHERE {
  ?norma ktn:berkaitanTopik ?t ;
         ktn:pasal ?pasal ;
         a ?jenis .
  ?t rdfs:label ?topik .
  FILTER(?jenis != owl:NamedIndividual)
  FILTER(?t IN (__TOPIK__))
}
ORDER BY ?topik ?pasal
"""


def topik_tersedia() -> list[str]:
    g = graph()
    return sorted(str(t).rsplit("#Topik", 1)[-1] for t in g.subjects(RDF.type, KTN.Topik))


def _lokal(iri) -> str:
    return str(iri).rsplit("#", 1)[-1]


def cari(topik: list[str]) -> list[dict]:
    """Kembalikan daftar butir ketentuan untuk topik yang diminta."""
    tersedia = set(topik_tersedia())
    tidak_dikenal = [t for t in topik if t not in tersedia]
    if tidak_dikenal:
        raise ValueError(f"topik tidak dikenal: {', '.join(tidak_dikenal)}")

    daftar_iri = ", ".join(f"ktn:Topik{t}" for t in topik)
    g = graph()
    hasil = []
    for row in g.query(_QUERY.replace("__TOPIK__", daftar_iri)):
        hasil.append({
            "topik": str(row.topik),
            "jenis": _lokal(row.jenis),
            "pasal": str(row.pasal),
            "norma": _lokal(row.norma),
        })
    return hasil
