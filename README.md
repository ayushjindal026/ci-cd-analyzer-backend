# 🚀 AI-Powered CI/CD Failure Intelligence Platform

Production-grade CI/CD analytics and AI-powered failure analysis platform built using Spring Boot, FastAPI, PostgreSQL, Redis, Docker, GitHub Actions, OAuth, and JWT authentication.

---

# 🧱 Architecture

```text
GitHub Actions
      ↓
Spring Boot Backend (Java)
      ↓
PostgreSQL + Flyway
      ↓
FastAPI AI Service (Python)
      ↓
Groq LLM (LLaMA 3.1)
```

---

# ⚙️ Tech Stack

## Backend

* Java 21
* Spring Boot 3
* Spring Security
* Spring Data JPA
* Flyway
* PostgreSQL
* Redis
* JWT Authentication
* GitHub OAuth

## AI Service

* Python 3.11+
* FastAPI
* Uvicorn
* Pydantic
* Groq API
* LLaMA 3.1 8B Instant

## DevOps

* Docker
* Docker Compose
* GitHub Actions

---

# 📦 Prerequisites

Install:

## Java

```bash
java -version
```

Recommended:

```text
Java 21
```

---

## Maven

```bash
mvn -version
```

---

## Python

```bash
python --version
```

Recommended:

```text
Python 3.11+
```

---

## Docker

```bash
docker --version
docker compose version
```

---

# 📥 Clone Repository

```bash
git clone https://github.com/ayushjindal026/ci-cd-analyzer-backend.git

cd ci-cd-analyzer-backend
```

---

# 🐘 Start PostgreSQL + Redis

```bash
docker compose up -d postgres redis
```

Verify:

```bash
docker ps
```

Expected containers:

* postgres
* redis

---

# 🔐 Generate GitHub Personal Access Token (PAT)

Go to:

[https://github.com/settings/tokens](https://github.com/settings/tokens)

Generate token with scopes:

```text
repo
workflow
read:org
```

Save token.

---

# 🔐 Create GitHub OAuth App

Go to:

[https://github.com/settings/developers](https://github.com/settings/developers)

Create OAuth App:

| Field            | Value                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Application Name | CI/CD Analyzer                                                                                         |
| Homepage URL     | [http://localhost:8081](http://localhost:8081)                                                         |
| Callback URL     | [http://localhost:8081/api/v1/auth/github/callback](http://localhost:8081/api/v1/auth/github/callback) |

After creation:

* Copy Client ID
* Generate Client Secret
* Save both

---

# 🔐 Generate JWT Secret

Run in PowerShell:

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object {Get-Random -Maximum 256}))
```

Copy generated value.

---

# 📄 Backend .env Setup

Create file:

```text
backend/api-service/.env
```

Add:

```env
# =========================
# GitHub API
# =========================
GITHUB_TOKEN=your_github_pat

# =========================
# GitHub OAuth
# =========================
GITHUB_CLIENT_ID=your_client_id
GITHUB_OAUTH_SECRET=your_oauth_secret

# =========================
# JWT
# =========================
JWT_SECRET=your_generated_jwt_secret
JWT_EXPIRATION=86400000

# =========================
# Database
# =========================
DB_URL=jdbc:postgresql://localhost:5433/cicd
DB_USERNAME=postgres
DB_PASSWORD=postgres

# =========================
# Redis
# =========================
REDIS_HOST=localhost
REDIS_PORT=6379

# =========================
# AI Service
# =========================
AI_SERVICE_URL=http://localhost:8000

# =========================
# Spring Profile
# =========================
SPRING_PROFILES_ACTIVE=dev
```

---

# 📄 AI Service .env Setup

Create file:

```text
ai-service/.env
```

Add:

```env
# =========================
# Groq / LLM
# =========================
OPENAI_API_KEY=your_groq_api_key
OPENAI_MODEL=llama-3.1-8b-instant
OPENAI_BASE_URL=https://api.groq.com/openai/v1

# =========================
# Logging
# =========================
LOG_LEVEL=INFO

# =========================
# AI Settings
# =========================
MAX_LOG_TOKENS=3000
```

---

# 🧠 Install AI Service Requirements

```bash
cd ai-service

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt
```

---

# 🚀 Start AI Service

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

# ✅ Verify AI Service

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected:

```json
{
  "status": "UP"
}
```

Swagger docs:

```text
http://localhost:8000/docs
```

---

# 🔧 Set Backend Environment Variables (PowerShell)

Open NEW PowerShell terminal:

```powershell
$env:GITHUB_TOKEN="your_pat"

$env:GITHUB_CLIENT_ID="your_client_id"

$env:GITHUB_OAUTH_SECRET="your_oauth_secret"

$env:JWT_SECRET="your_jwt_secret"
```

---

# 🚀 Start Backend

Open NEW terminal:

```bash
cd backend
mvn clean install
cd backend/api-service
mvn spring-boot:run
```

---

# ✅ Verify Backend

```powershell
Invoke-RestMethod http://localhost:8081/actuator/health
```

Expected:

```json
{
  "status": "UP"
}
```

---

# 🔐 OAuth Login

Open browser:

```text
http://localhost:8081/api/v1/auth/github/login
```

Expected:

* GitHub login screen
* OAuth redirect
* JWT token response

Example response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "tokenType": "Bearer",
    "userId": 1,
    "username": "ayushjindal026"
  }
}
```

---

# 📁 Repository APIs

## Get repositories

```powershell
Invoke-RestMethod -Method GET `
-Uri "http://localhost:8081/api/v1/repositories"
```

---

## Add repository

```powershell
Invoke-RestMethod -Method POST `
-Uri "http://localhost:8081/api/v1/repositories" `
-ContentType "application/json" `
-Body '{
  "owner": "ayushjindal026",
  "repoName": "ci-cd-analyzer-backend",
  "source": "GITHUB_ACTIONS"
}'
```

---

## Sync repository

```powershell
Invoke-RestMethod -Method POST `
-Uri "http://localhost:8081/api/v1/repositories/2/sync"
```

Expected:

```json
{
  "success": true,
  "message": "Sync completed"
}
```

---

# 📊 Pipeline Run APIs

## Get runs

```powershell
Invoke-RestMethod -Method GET `
-Uri "http://localhost:8081/api/v1/repositories/2/runs"
```

---

## Get run details

```powershell
$response = Invoke-RestMethod -Method GET `
-Uri "http://localhost:8081/api/v1/repositories/2/runs"

$response.data.content
```

---

# 🤖 AI Analysis APIs

## Analyze failed run

IMPORTANT:
Use FAILED run IDs only.

Example:

```powershell
Invoke-RestMethod -Method POST `
-Uri "http://localhost:8081/api/v1/repositories/2/runs/23/analyse"
```

Expected:

```json
{
  "success": true,
  "data": {
    "category": "DEPENDENCY_FAILURE",
    "rootCauseSummary": "Dependency resolution failed",
    "suggestedFix": "Verify Maven dependencies",
    "confidenceScore": 0.91
  }
}
```

---

## Get analysis result

```powershell
Invoke-RestMethod -Method GET `
-Uri "http://localhost:8081/api/v1/repositories/2/runs/23/analysis"
```

---

# 🔒 Using JWT Token With APIs

Save token:

```powershell
$token="your_jwt_token"
```

Use authenticated request:

```powershell
Invoke-RestMethod -Method GET `
-Uri "http://localhost:8081/api/v1/repositories" `
-Headers @{
    Authorization = "Bearer $token"
}
```

---

# 🐳 Docker Compose

Start everything:

```bash
docker compose up --build
```

Stop everything:

```bash
docker compose down
```

---

# 📦 Common Commands

## Rebuild backend

```bash
mvn clean install
```

---

## Restart backend

```bash
mvn spring-boot:run
```

---

## Activate Python venv

```bash
venv\Scripts\activate
```

---

## Start AI service

```bash
uvicorn app.main:app --reload
```

---

# 🧪 Troubleshooting

## 403 Forbidden

Cause:
Spring Security blocking APIs.

Temporary fix:

```java
.requestMatchers(
    "/api/v1/repositories/**"
).permitAll()
```

---

## 401 Unauthorized

Cause:
JWT token missing or invalid.

Fix:
Use:

```powershell
-Headers @{ Authorization = "Bearer token_here" }
```

---

## 500 Internal Server Error on /sync

Usually:

* wrong repository ID
* invalid GitHub token
* missing PAT scopes

Required scopes:

```text
repo
workflow
read:org
```

---

## Could not resolve placeholder

Cause:
Spring Boot not reading env vars.

Fix:

```powershell
$env:GITHUB_CLIENT_ID="value"
```

before starting backend.

---

## AI Service 404 on /

Normal.

Use:

```text
http://localhost:8000/docs
```

or:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

---

# 📁 Project Structure

```text
ci-cd-analyzer-backend/
│
├── backend/
│   └── api-service/
│       ├── src/
│       ├── Dockerfile
│       └── .env
│
├── ai-service/
│   ├── app/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── docker-compose.yml
│
└── .github/workflows/
```

---

# 🚀 Features Implemented

## Backend

* Repository onboarding
* GitHub Actions ingestion
* Pipeline run storage
* OAuth login
* JWT authentication
* Analytics APIs
* AI analysis APIs
* Flyway migrations

## AI

* Groq LLM integration
* Failure root cause analysis
* Suggested fixes
* Confidence scoring

## DevOps

* Docker Compose
* GitHub Actions CI
* Redis caching
* Production-ready architecture

---

# 🔥 Future Enhancements

* React dashboard
* Async queue processing
* Slack/email alerts
* Kubernetes deployment
* Multi-user workspaces
* AI similarity detection
* Failure trend graphs

---

# 👨‍💻 Author

Ayush Jindal

GitHub:
[https://github.com/ayushjindal026/ci-cd-analyzer-backend](https://github.com/ayushjindal026/ci-cd-analyzer-backend)
