# Dashboard backend (flattened structure)

## Local build
From repo root:
```bash
cd backend
./mvnw -B -DskipITs=true package
```

## Run locally (jar)

```bash
java -jar target/*.jar
# then:
curl -sS http://localhost:8080/actuator/health
```

## Docker / Compose (dev/demo)

Start redis and backend via docker-compose (run from repo root):

```bash
# From repo root directory
docker compose up -d redis
# build backend image (uses backend/Dockerfile)
docker compose build backend
docker compose up -d backend
```

Health:

```bash
curl -sS http://localhost:8080/actuator/health
```

## Demo steps

1. Start compose from repo root: `docker compose up -d redis backend` (or build backend image then run).
2. Seed demo data:

```bash
./scripts/seed-redis.sh
```

3. Run smoke:

```bash
./scripts/run-smoke.sh
```

## Notes

* Keep credentials in env vars or CI secrets. Do not commit real API keys.
* To test integration-tests against compose Redis set environment:

  * `TESTCONTAINERS_DISABLED=true SPRING_TESTCONTAINERS_ENABLED=false REDIS_HOST=redis mvn -B test`
