# Fase 0: backend v2

Backend Java untuk KB hukum ketenagakerjaan. Fase 0 baru berisi skeleton,
Docker, kontrak API, dan fixture golden case. Logika KB menyusul di fase
berikutnya.

## Prasyarat

- Java 21
- Maven 3.10+
- Docker dan Docker Compose

## Jalankan lokal

```bash
cd backend-v2
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

Cek:

```bash
curl localhost:8080/health
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
cd backend-v2
mvn test
```

## Struktur

```
src/main/java/ac/id/uns/kbr/
  KbApplication.java
  api/          controller
  config/       konfigurasi bertipe
  kb/           ontology, reasoner, retrieval, rules (fase berikutnya)
  chat/         router dan state (fase berikutnya)
  dokumen/      dokumen dan klausul (fase berikutnya)
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

Kontrak input/output SWRL ada di `KB_CONTRACT.md`. Mode perhitungan diatur
lewat `kb.calculation.mode` (`java`, `swrl`, `auto`). Default `java` selama
rule SWRL dari KB belum tersedia.

