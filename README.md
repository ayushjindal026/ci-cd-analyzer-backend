# CI/CD Pipeline Analyzer 🚀

## 📌 Overview
A backend system that ingests CI/CD pipeline data, analyzes build performance, and detects flaky workflows using intelligent metrics.

## 🔥 Features
- 📊 Repository metrics (success rate, failure rate, duration)
- 📈 Build trend analytics (time-series)
- ⚠️ Flaky workflow detection (FAIL → PASS pattern)
- ⚡ Redis caching for performance optimization
- 🔁 Scheduled ingestion system

## 🧱 Tech Stack
- Java (Spring Boot)
- PostgreSQL
- Redis
- Docker
- Maven

## 🏗️ Architecture
[Add diagram later]

Services:
- api-service → REST APIs
- analytics-service → metrics engine
- ingestion-service → data ingestion

## 🚀 API Endpoints
- `/metrics`
- `/metrics/trend`
- `/flaky`

## 🧠 Key Concept
Flaky workflow detection:
FAIL → SUCCESS on same commit SHA

## 📌 Future Improvements
- Frontend dashboard (React)
- GitHub webhook integration
- Alerting system
