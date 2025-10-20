# STAGE 1 - build (Maven + JDK21)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# cache dependencies
COPY ../../pom.xml ./parent-pom.xml
COPY pom.xml .
RUN mvn -B dependency:go-offline -DskipTests -f pom.xml

# copy sources and build
COPY src ./src
RUN mvn -B clean package -DskipTests -f pom.xml

# STAGE 2 - runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
