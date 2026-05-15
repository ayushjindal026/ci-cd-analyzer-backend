# 🚀 PipelineIQ — AI-Powered CI/CD Failure Intelligence Platform

Production-grade CI/CD analytics and AI-powered failure intelligence platform built using:

- Spring Boot 3
- Java 21
- FastAPI
- PostgreSQL
- Redis
- Docker
- GitHub Actions
- JWT Authentication
- GitHub OAuth
- Groq / OpenAI LLMs

PipelineIQ automatically ingests GitHub Actions workflow runs, analyzes failures using AI, detects flaky pipelines, and provides actionable remediation insights.

---

# 🧠 Core Features

## 🔍 CI/CD Intelligence
- GitHub Actions ingestion
- Workflow run tracking
- Pipeline stage analytics
- Failure trend analysis
- Flaky test detection

## 🤖 AI Failure Analysis
- Root cause analysis
- Failure classification
- Suggested remediation steps
- Similar failure detection
- Confidence scoring

## 🔐 Authentication & Security
- GitHub OAuth Login
- JWT Authentication
- Spring Security
- Role-based access architecture

## 📊 Analytics
- Success/failure rate tracking
- Average build duration
- Historical failure analytics
- Repository health metrics

## ⚡ DevOps
- Dockerized services
- Multi-module backend
- Redis caching
- PostgreSQL persistence
- GitHub webhook support

---

# 🧱 High-Level Architecture

```text
GitHub Actions
      ↓
Webhook + Polling Ingestion
      ↓
Spring Boot API Service
      ↓
PostgreSQL + Redis
      ↓
AI Intelligence Layer
      ↓
Groq / OpenAI LLM
```

---

# 🏗 Backend Architecture

```text
backend/
│
├── common/
│   ├── entity/
│   ├── enums/
│   └── dto/
│
├── ingestion-service/
│   ├── scheduler/
│   ├── mapper/
│   └── github/
│
├── analytics-service/
│
└── api-service/
    ├── controller/
    ├── service/
    ├── repository/
    ├── security/
    ├── config/
    └── dto/
```

---

# ⚙️ Tech Stack

## Backend
- Java 21
- Spring Boot 3
- Spring Security
- Spring Data JPA
- Spring Retry
- Flyway
- PostgreSQL
- Redis
- Maven

## AI Service
- Python 3.11+
- FastAPI
- Uvicorn
- Groq API
- OpenAI-compatible APIs

## Frontend
- React
- Vite
- Tailwind CSS
- Recharts
- Lucide Icons

## DevOps
- Docker
- Docker Compose
- GitHub Actions

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
git clone https://github.com/ayushjindal026/cicd-analyzer.git

cd cicd-analyzer
```

---

# 🔐 Environment Variables

# Backend

Create:

```text
backend/api-service/.env
```

```env
# =========================
# Database
# =========================
DB_URL=jdbc:postgresql://localhost:5432/pipelineiq
DB_USERNAME=postgres
DB_PASSWORD=postgres

# =========================
# JWT
# =========================
JWT_SECRET=your_jwt_secret

# =========================
# GitHub OAuth
# =========================
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# =========================
# GitHub API
# =========================
GITHUB_TOKEN=your_github_pat

# =========================
# AI
# =========================
AI_PROVIDER=groq

OPENAI_API_KEY=your_key
GROQ_API_KEY=your_key

# =========================
# Frontend
# =========================
FRONTEND_URL=http://localhost:3000
```

---

# AI Service

Create:

```text
ai-service/.env
```

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=llama-3.1-8b-instant
OPENAI_BASE_URL=https://api.groq.com/openai/v1
```

---

# 🐳 Start Infrastructure

```bash
docker compose up -d postgres redis
```

---

# 🧠 Start AI Service

```bash
cd ai-service

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Verify:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

---

# 🚀 Start Backend

```bash
cd backend

mvn clean install

cd api-service

mvn spring-boot:run
```

Verify:

```powershell
Invoke-RestMethod http://localhost:8081/actuator/health
```

---

# 🔐 GitHub OAuth Login

Open:

```text
http://localhost:8081/api/v1/auth/github/login
```

---

# 📁 Core APIs

# Repositories

## Add Repository

```http
POST /api/v1/repositories
```

Example:

```json
{
  "owner": "ayushjindal026",
  "repoName": "cicd-analyzer",
  "source": "GITHUB_ACTIONS"
}
```

---

## Sync Repository

```http
POST /api/v1/repositories/{id}/sync
```

---

# Pipeline Runs

## Get Runs

```http
GET /api/v1/repositories/{id}/runs
```

---

## Get Run Details

```http
GET /api/v1/repositories/{id}/runs/{runId}
```

---

# AI Analysis

## Analyze Failed Run

```http
POST /api/v1/repositories/{id}/runs/{runId}/analyse
```

---

## Get Analysis Result

```http
GET /api/v1/repositories/{id}/runs/{runId}/analysis
```

---

# 🧠 AI Intelligence Layer

PipelineIQ includes:

## Log Parsing
- GitHub Actions log extraction
- Failure signature generation
- Stage-level error extraction

## Failure Classification
- Dependency failures
- Test failures
- Docker failures
- Build failures
- Infrastructure/network failures

## AI Analysis
- Root cause summarization
- Suggested remediation
- Severity detection
- Similar incident matching

---

# 📊 Database Entities

Core entities:

- `MonitoredRepository`
- `PipelineRun`
- `PipelineStage`
- `FailureRecord`
- `RunAnalysis`
- `User`

---

# 🏗 Current System Status

## Backend
✅ Multi-module architecture  
✅ GitHub OAuth  
✅ JWT authentication  
✅ GitHub Actions ingestion  
✅ AI analysis APIs  
✅ Failure classification  
✅ Analytics aggregation  
✅ Webhook processing  
✅ PostgreSQL persistence  
✅ Redis integration  

## Frontend
✅ Dashboard UI  
✅ Runs page  
✅ AI insights page  
✅ Notification center  
✅ Settings persistence  
✅ Dark/light theme  
✅ Repository management UI  

## AI
✅ Groq/OpenAI integration  
✅ Failure summarization  
✅ Remediation suggestions  
✅ Similarity-ready architecture  
✅ Embedding foundation  

---

# ⚠️ Known Limitations

- Kubernetes deployment pending
- Vector database integration pending
- Slack/email notifications in progress
- WebSocket real-time updates not yet implemented
- Multi-user organization support incomplete

---

# 🚧 Upcoming Features

- Slack alerts
- Email notifications
- Vector similarity search
- Kubernetes deployment
- AWS production deployment
- Real-time WebSockets
- Multi-user organizations
- AI remediation automation

---

# 🐳 Docker

Build everything:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

---

# 👨‍💻 Author

Ayush Jindal

## GitHub

https://github.com/ayushjindal026

---

# ⭐ If You Like This Project

Star the repository and support the project 🚀

---
