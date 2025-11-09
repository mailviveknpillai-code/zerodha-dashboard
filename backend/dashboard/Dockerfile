# STAGE 1 - build (Maven + JDK21)
FROM maven:3.9.6-eclipse-temurin-21 AS build

# We'll use /app as the root workspace, and /app/dashboard as module dir
WORKDIR /app/dashboard

# Copy parent and child POMs in correct locations relative to each other
# - With build context set to ./backend, this copies backend/pom.xml to /app/pom.xml
COPY pom.xml ../pom.xml
# - Copy child module pom to /app/dashboard/pom.xml
COPY dashboard/pom.xml ./pom.xml

# Cache dependencies for the child module
RUN mvn -B -f pom.xml dependency:go-offline -DskipTests

# Copy sources and build the module
COPY dashboard/src ./src
RUN mvn -B -f pom.xml clean package -DskipTests

# STAGE 2 - runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/dashboard/target/*.jar app.jar
EXPOSE 9000
ENTRYPOINT ["java","-jar","/app/app.jar"]
