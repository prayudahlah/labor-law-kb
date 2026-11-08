# Backend Java

Backend Java untuk KB hukum ketenagakerjaan. Endpoint `/infer`, `/ketentuan`,
`/chat`, dan `/dokumen` sudah aktif. Backend Python lama diarsipkan di
`backend-python/`.

## Prasyarat

- Java 21
- Maven 3.10+
- Docker dan Docker Compose

## Jalankan lokal

```bash
cd backend
KB_ONTOLOGY_DIR=../ontology KB_DATA_DIR=../data mvn spring-boot:run
```

Cek:

```bash
curl localhost:8080/health
```

## Jalankan dengan Docker

Dari root repo:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Health lewat frontend: http://localhost:3000/health

Cek:

```bash
curl localhost:3000/health
```

## Endpoint

- `GET /health`
- `POST /infer`
- `POST /ketentuan`
- `POST /chat`
- `POST /dokumen`

Contoh:

```bash
curl -X POST localhost:8080/infer \
  -H 'Content-Type: application/json' \
  -d '{"topik":"PHK","fakta":{"masaKerjaBulan":120,"upahBulanan":5000000,"alasanPHK":"EfisiensiRugi"}}'
```

## Test

```bash
cd backend
mvn test
```

## CI

`.github/workflows/backend.yml` menjalankan `mvn test`, build frontend,
dan build kedua image Docker.

## Struktur

```
src/main/java/ac/id/uns/kbr/
  KbApplication.java
  api/          controller
  config/       konfigurasi bertipe
  kb/           ontology, reasoner, retrieval, perhitungan
  chat/         router dan state sesi
  dokumen/      template dan klausul dokumen
```

## Status

- [x] Skeleton Spring Boot
- [x] `/health`
- [x] Docker dan compose
- [x] Kontrak API
- [x] Fixture golden case
- [x] Spike OWL API + Openllet
- [x] Spike SWRL `swrlb`
- [x] `CalculationProvider` dengan fallback Java dan pembaca output SWRL
- [x] `/infer`, `/ketentuan`, `/chat`, `/dokumen`
- [x] Full stack Docker dan nginx
- [x] CI test dan build image

Kontrak input/output SWRL ada di `KB_CONTRACT.md`. Mode perhitungan diatur
lewat `kb.calculation.mode` (`java`, `swrl`, `auto`). Default `java` selama
rule SWRL dari KB belum tersedia.

