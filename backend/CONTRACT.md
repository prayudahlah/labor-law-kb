# Kontrak API v2

Kontrak ini mengikuti perilaku `backend-python/app/schemas.py` dan
`backend-python/app/main.py` (backend Python lama, arsip). Frontend tidak
boleh berubah.

## GET /health

Response:

```json
{ "status": "ok" }
```

## POST /infer

Request, discriminated union berdasarkan `topik`:

```json
{
  "topik": "PHK",
  "fakta": {
    "masaKerjaBulan": 120,
    "upahBulanan": 5000000,
    "bentukHubunganKerja": "PKWTT",
    "alasanPHK": "EfisiensiRugi"
  }
}
```

Response:

```json
{
  "mode": "inferensi",
  "hak": ["Pesangon", "UPMK", "UPH", "CutiTahunan", "JaminanSosial"],
  "rincian": { "pesangon_bulan": 4.5, "upmk_bulan": 4.0, "total_bulan": 8.5 },
  "nominal": 42500000,
  "pasal": ["Pasal 43 ayat (1)"],
  "narasi": "Berdasarkan data Anda, ...",
  "catatan": "Bukan nasihat hukum."
}
```

Topik yang didukung: `PHK`, `Lembur`, `Cuti`, `PKWT`, `Jamsos`, `KIA`.

## POST /ketentuan

Request:

```json
{ "topik": ["Cuti", "Upah"], "wajib": true }
```

Response:

```json
{
  "mode": "retrieval",
  "scope": { "topik": ["Cuti", "Upah"] },
  "butir": [
    {
      "topik": "Cuti",
      "jenis": "PeristiwaCutiKhusus",
      "pasal": "Pasal 93 ayat (4)a",
      "norma": "CutiMenikah"
    }
  ],
  "narasi": "Terdapat ...",
  "catatan": "Daftar ketentuan, bukan nasihat hukum."
}
```

`wajib` belum dipakai. Untuk v2, semantiknya ditentukan di fase dokumen.

## POST /chat

Request:

```json
{ "sesi": "s-123", "pesan": "saya di-phk, gaji 5 juta, sudah 10 tahun" }
```

Response memakai satu bentuk, field yang tidak relevan bernilai `null`:

```json
{
  "mode": "klarifikasi | inferensi | retrieval",
  "pesan": null,
  "pertanyaan": null,
  "pilihan": null,
  "kurang": null,
  "scope": null,
  "hak": null,
  "rincian": null,
  "nominal": null,
  "pasal": null,
  "butir": null,
  "narasi": null,
  "slot": null,
  "state": null,
  "catatan": "Bukan nasihat hukum."
}
```

Catatan penting untuk v2:

- `rincian` dan `pasal` **wajib ada** di response `/chat` mode inferensi.
  Backend Python sekarang menghitung keduanya, tetapi `ChatResponse` belum
  mendeklarasikannya, sehingga `response_model` membuangnya.
- `butir` harus bertipe `list[ButirKetentuan]`, bukan `list[dict]`.
- `mode` harus `Literal["klarifikasi", "inferensi", "retrieval", "dokumen"]`.

## POST /dokumen (belum diimplementasikan)

Direncanakan di fase dokumen:

```json
{
  "sesi": "s-123",
  "dokumen": "peraturan_perusahaan",
  "topik": ["Cuti", "Upah"],
  "fakta": {}
}
```

Response:

```json
{
  "mode": "dokumen",
  "dokumen": "peraturan_perusahaan",
  "wajib": [],
  "opsional": [],
  "template": "...",
  "pasal": [],
  "catatan": "Draf, bukan nasihat hukum."
}
```

## Error

Validasi request mengikuti bentuk FastAPI 422:

```json
{
  "detail": [
    {
      "type": "greater_than",
      "loc": ["body", "PHK", "fakta", "upahBulanan"],
      "msg": "Input should be greater than 0",
      "input": -1,
      "ctx": { "gt": 0.0 }
    }
  ]
}
```

Frontend membaca `detail`. Jadi error handler v2 harus mempertahankan bentuk
ini, bukan format default Spring Boot.
