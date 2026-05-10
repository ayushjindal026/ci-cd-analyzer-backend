# ═════════════════════════════════════════════════════════════════════════════
# Build Stage
# ═════════════════════════════════════════════════════════════════════════════
FROM gradle:8.7-jdk21 AS builder

WORKDIR /app

COPY . .

RUN gradle clean bootJar --no-daemon

# ═════════════════════════════════════════════════════════════════════════════
# Runtime Stage
# ═════════════════════════════════════════════════════════════════════════════
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]