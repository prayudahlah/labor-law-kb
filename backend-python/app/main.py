"""Aplikasi FastAPI: /health, /infer, /ketentuan, /chat."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from . import chat, forms, narasi, ontology, retrieval, shacl_validator, schemas


@asynccontextmanager
async def lifespan(app: FastAPI):
    ontology.muat_kb()  # muat KB sekali saat startup
    yield


app = FastAPI(title="KB Hukum Ketenagakerjaan", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/infer", response_model=schemas.InferResponse)
def infer(req: schemas.InferRequest) -> dict:
    fakta = req.fakta.model_dump()

    # Validasi closed-world atas kasus sebelum reasoning.
    graph = forms.buat_graph_kasus(req.topik, fakta)
    conform, laporan = shacl_validator.validasi(req.topik, graph)
    if not conform:
        raise HTTPException(status_code=422, detail=laporan)

    hasil = ontology.analisis(req.topik, fakta)
    hasil["narasi"] = narasi.narasi(hasil)
    return hasil


@app.post("/ketentuan", response_model=schemas.KetentuanResponse)
def ketentuan(req: schemas.KetentuanRequest) -> dict:
    try:
        butir = retrieval.cari(req.topik)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    hasil = {
        "mode": "retrieval",
        "scope": {"topik": req.topik},
        "butir": butir,
        "catatan": "Daftar ketentuan, bukan nasihat hukum.",
    }
    hasil["narasi"] = narasi.narasi(hasil)
    return hasil


@app.post("/chat", response_model=schemas.ChatResponse)
def kirim_chat(req: schemas.ChatRequest) -> dict:
    hasil = chat.jawab(req.sesi, req.pesan)
    if hasil.get("mode") in ("inferensi", "retrieval"):
        hasil["narasi"] = narasi.narasi(hasil)
    return hasil
