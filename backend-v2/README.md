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
- [ ] Spike OWL API + Openllet
- [ ] Spike SWRL `swrlb`
- [ ] `/infer`, `/ketentuan`, `/chat`
- [ ] `/dokumen`
