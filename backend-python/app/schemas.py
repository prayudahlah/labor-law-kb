"""Model request/response (kontrak API)."""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


# --- Fakta per topik -------------------------------------------------------

class FaktaPHK(BaseModel):
    masaKerjaBulan: int = Field(ge=0)
    upahBulanan: float = Field(gt=0)
    alasanPHK: str
    bentukHubunganKerja: str = "PKWTT"


class FaktaLembur(BaseModel):
    jamLembur: float = Field(gt=0, le=18)
    padaHariKerja: bool = True
    upahBulanan: float = Field(gt=0)


class FaktaCuti(BaseModel):
    masaKerjaBulan: int = Field(ge=0)
    peristiwa: str | None = None      # nama individu PeristiwaCutiKhusus, mis. CutiMenikah
    perempuan: bool = False


class FaktaPKWT(BaseModel):
    bentukHubunganKerja: Literal["PKWT", "PKWTT"] = "PKWT"
    masaKerjaBulan: int = Field(gt=0)
    upahBulanan: float = Field(gt=0)


class FaktaJamsos(BaseModel):
    upahBulanan: float = Field(gt=0)


class FaktaKIA(BaseModel):
    sedangCutiMelahirkan: bool = True
    cutiMelahirkanBulan: int = Field(ge=3, le=6)
    upahBulanan: float = Field(gt=0)


# --- Request per topik (discriminated by 'topik') --------------------------

class ReqPHK(BaseModel):
    topik: Literal["PHK"] = "PHK"
    fakta: FaktaPHK


class ReqLembur(BaseModel):
    topik: Literal["Lembur"] = "Lembur"
    fakta: FaktaLembur


class ReqCuti(BaseModel):
    topik: Literal["Cuti"] = "Cuti"
    fakta: FaktaCuti


class ReqPKWT(BaseModel):
    topik: Literal["PKWT"] = "PKWT"
    fakta: FaktaPKWT


class ReqJamsos(BaseModel):
    topik: Literal["Jamsos"] = "Jamsos"
    fakta: FaktaJamsos


class ReqKIA(BaseModel):
    topik: Literal["KIA"] = "KIA"
    fakta: FaktaKIA


InferRequest = Annotated[
    Union[ReqPHK, ReqLembur, ReqCuti, ReqPKWT, ReqJamsos, ReqKIA],
    Field(discriminator="topik"),
]


# --- Response --------------------------------------------------------------

class InferResponse(BaseModel):
    mode: str
    hak: list[str]
    rincian: dict | None = None
    nominal: float | None = None
    pasal: list[str] = []
    narasi: str | None = None
    catatan: str = "Bukan nasihat hukum."


class KetentuanRequest(BaseModel):
    topik: list[str] = Field(min_length=1)
    wajib: bool | None = None  # dipakai untuk retrieval per dokumen (nanti)


class ButirKetentuan(BaseModel):
    topik: str
    jenis: str
    pasal: str
    norma: str


class KetentuanResponse(BaseModel):
    mode: str = "retrieval"
    scope: dict
    butir: list[ButirKetentuan]
    narasi: str | None = None
    catatan: str = "Daftar ketentuan, bukan nasihat hukum."


class ChatRequest(BaseModel):
    sesi: str = "default"
    pesan: str


class ChatResponse(BaseModel):
    mode: str
    pesan: str | None = None
    pertanyaan: str | None = None
    pilihan: list[str] | None = None
    kurang: list[str] | None = None
    scope: dict | None = None
    hak: list[str] | None = None
    nominal: float | None = None
    butir: list[dict] | None = None
    narasi: str | None = None
    slot: dict | None = None
    state: dict | None = None
    catatan: str = "Bukan nasihat hukum."
