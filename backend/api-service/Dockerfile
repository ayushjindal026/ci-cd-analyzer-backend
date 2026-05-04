FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy parent POM and all module POMs first (layer caching)
COPY pom.xml .
COPY common/pom.xml common/pom.xml
COPY ingestion-service/pom.xml ingestion-service/pom.xml
COPY analytics-service/pom.xml analytics-service/pom.xml
COPY api-service/pom.xml api-service/pom.xml

# Copy source
COPY common/src common/src
COPY ingestion-service/src ingestion-service/src
COPY analytics-service/src analytics-service/src
COPY api-service/src api-service/src

# Build — skip tests in Docker (tests run in CI pipeline)
RUN ./mvnw clean package -DskipTests 2>/dev/null || \
    mvn clean package -DskipTests

# ── Runtime image — smaller than JDK ──────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/api-service/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]