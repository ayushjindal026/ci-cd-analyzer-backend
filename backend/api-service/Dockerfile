# ═════════════════════════════════════════════════════════════════════════════
# Build Stage
# ═════════════════════════════════════════════════════════════════════════════
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# ── Parent + module POMs (better cache) ───────────────────────────────────
COPY pom.xml .

COPY common/pom.xml common/pom.xml
COPY ingestion-service/pom.xml ingestion-service/pom.xml
COPY analytics-service/pom.xml analytics-service/pom.xml
COPY api-service/pom.xml api-service/pom.xml

# ── Download dependencies ─────────────────────────────────────────────────
RUN mvn dependency:go-offline

# ── Copy source ───────────────────────────────────────────────────────────
COPY common/src common/src
COPY ingestion-service/src ingestion-service/src
COPY analytics-service/src analytics-service/src
COPY api-service/src api-service/src

# ── Build only API service + dependencies ────────────────────────────────
RUN mvn -pl api-service -am clean package -DskipTests

# ═════════════════════════════════════════════════════════════════════════════
# Runtime Stage
# ═════════════════════════════════════════════════════════════════════════════
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/api-service/target/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

EXPOSE 8081

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]