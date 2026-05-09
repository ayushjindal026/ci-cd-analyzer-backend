# ── Build stage ───────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy parent and module POMs first (better cache)
COPY pom.xml .

COPY common/pom.xml common/pom.xml
COPY ingestion-service/pom.xml ingestion-service/pom.xml
COPY analytics-service/pom.xml analytics-service/pom.xml
COPY api-service/pom.xml api-service/pom.xml

# Download dependencies first
RUN mvn dependency:go-offline

# Copy source code
COPY common/src common/src
COPY ingestion-service/src ingestion-service/src
COPY analytics-service/src analytics-service/src
COPY api-service/src api-service/src

# Build project
RUN mvn clean package -DskipTests

# ── Runtime stage ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/api-service/target/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]