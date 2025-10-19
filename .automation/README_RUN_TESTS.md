# Run tests & push feature branch (PowerShell / Git Bash)

# 1. Create a feature branch

git checkout -b feature/phase2-tickmodel

# 2. Stage only the new model and test files

git add backend/dashboard/src/main/java/com/zerodha/dashboard/model/TickSnapshot.java
git add backend/dashboard/src/test/java/com/zerodha/dashboard/model/TickSnapshotTest.java

# 3. Commit

git commit -m "feat(model): add TickSnapshot model + unit tests"

# 4. Run tests inside a Maven Docker container attached to the compose network

# Replace /c/vivek/... path with your absolute path if different.

docker compose up -d redis

docker run --rm `
    -v C:\vivek\freelance\zerodha-dashboard\backend\dashboard:/app `
    -w /app `
    --network backend_default `
    -e REDIS_HOST=redis `
    -e REDIS_PORT=6379 `
    -e TESTCONTAINERS_DISABLED=true `
    -e SPRING_TESTCONTAINERS_ENABLED=false `
    maven:3.9.6-eclipse-temurin-21 `
    mvn -B -DskipTests=false test

# 5. If tests pass, push the branch and open a PR:

git push -u origin feature/phase2-tickmodel

# Optional: create a PR using gh CLI

gh pr create --fill --base develop --head feature/phase2-tickmodel

To run with mock adapter (default)
  - market.adapter=mock (in application.properties) or pass `-Dmarket.adapter=mock`
To run with zerodha adapter (skeleton):
  - set `-Dmarket.adapter=zerodha` (Zerodha adapter is currently a skeleton)