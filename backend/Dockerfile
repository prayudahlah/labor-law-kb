FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY backend/pom.xml backend/pom.xml
RUN mvn -f backend/pom.xml -q dependency:go-offline
COPY backend backend
RUN mvn -f backend/pom.xml -q package -DskipTests

FROM eclipse-temurin:21-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /src/backend/target/*.jar app.jar
COPY ontology ontology
COPY data data
ENV KB_ONTOLOGY_DIR=/app/ontology
ENV KB_DATA_DIR=/app/data
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD curl -f http://localhost:8080/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
