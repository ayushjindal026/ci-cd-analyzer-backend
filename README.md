# 🚀 PipelineIQ — AI-Powered CI/CD Failure Intelligence Platform

**PipelineIQ** is an AI-powered CI/CD failure intelligence platform that automatically ingests GitHub Actions workflow runs, analyzes pipeline failures, identifies root causes, and provides actionable, developer-focused remediation guidance.

The goal is not just to tell developers **what failed**, but to explain:

* **Why it failed**
* **Where it failed**
* **Which file and step are responsible**
* **What code is causing the problem**
* **What exactly should be changed**
* **What code should replace it**
* **Why the fix works**
* **How to verify the fix**

PipelineIQ is designed to provide a debugging experience closer to an AI coding assistant such as ChatGPT or Claude, but specifically focused on CI/CD failures.

---

# 🧠 Core Features

## 🔍 CI/CD Intelligence

* GitHub Actions workflow ingestion
* Workflow run tracking
* Pipeline stage tracking
* Failure classification
* Failure trend analysis
* Pipeline health analytics
* Flaky pipeline detection

## 🤖 AI Failure Intelligence

PipelineIQ analyzes failed pipeline runs using GitHub Actions logs and contextual pipeline information.

The AI analysis includes:

* Failure summary
* Root cause analysis
* Failure classification
* Severity
* Confidence score
* Affected component
* Failed workflow/job/step
* Relevant error messages
* Problematic file
* Problematic code
* Explanation of why the code failed
* Exact remediation
* Replacement code where possible
* Verification steps
* Similar failure patterns

The objective is to move from:

> "Your pipeline failed because of an error."

to:

> **"This file and this step caused the failure. This code is responsible. Replace it with this code because this is why the failure occurs."**

---

# 🔬 Context-Aware Failure Analysis

PipelineIQ is being designed to provide the AI with more than raw logs.

Relevant analysis context can include:

* Repository name
* Branch
* Commit SHA
* Workflow filename
* GitHub Actions job
* Failed step
* Relevant log section
* Surrounding log lines
* Error messages
* Stack traces
* Exit codes
* File paths detected in logs
* Workflow YAML
* Relevant code snippets

This allows the AI to provide precise, code-level debugging recommendations rather than generic remediation advice.

---

# 🏗 High-Level Architecture

```text
                    GitHub
                       │
                       ▼
              GitHub Actions
                       │
             Webhook / Polling
                       │
                       ▼
             Ingestion Service
                       │
                       ▼
              Spring Boot API
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        PostgreSQL              Redis
             │
             ▼
       Pipeline Analysis
        Orchestrator
             │
             ▼
       AI Analysis Service
             │
             ▼
        AI Provider Client
             │
             ▼
        Groq / OpenAI
             │
             ▼
      Structured AI Response
             │
             ▼
        PostgreSQL
             │
             ▼
       React AI Insights
```

---

# 🧱 Project Architecture

```text
cicd-analyzer/
│
├── backend/
│   ├── common/
│   │   ├── entity/
│   │   ├── enums/
│   │   └── dto/
│   │
│   ├── ingestion-service/
│   │   ├── scheduler/
│   │   ├── mapper/
│   │   └── github/
│   │
│   ├── analytics-service/
│   │
│   └── api-service/
│       ├── controller/
│       ├── service/
│       ├── repository/
│       ├── security/
│       ├── config/
│       └── dto/
│
├── ai-service/
│
├── frontend/
│
├── docker-compose.yml
└── .env
```

---

# ⚙️ Technology Stack

## Backend

* Java 21
* Spring Boot 3
* Spring Security
* Spring Data JPA
* Spring Retry
* Flyway
* PostgreSQL
* Redis
* Maven

## AI Service

* Python 3.11+
* FastAPI
* Uvicorn
* Groq API
* OpenAI-compatible APIs

## Frontend

* React
* Vite
* Tailwind CSS
* Recharts
* Lucide Icons

## DevOps

* Docker
* Docker Compose
* GitHub Actions

---

# 🔐 Authentication & Security

PipelineIQ supports:

* GitHub OAuth
* JWT authentication
* Spring Security
* Role-based security architecture

---

# 📊 Analytics

PipelineIQ tracks CI/CD health through:

* Success/failure rates
* Average build duration
* Historical failure trends
* Repository health
* Pipeline stage performance
* Failure patterns

---

# 📦 Prerequisites

Install the following:

### Java

```bash
java -version
```

Recommended:

```text
Java 21
```

### Maven

```bash
mvn -version
```

### Python

```bash
python --version
```

Recommended:

```text
Python 3.11+
```

### Docker

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

# 🔐 Environment Configuration

## Backend

Configure the required environment variables for:

* PostgreSQL
* JWT
* GitHub OAuth
* GitHub API access
* AI provider
* Frontend URL

Example:

```env
DB_URL=jdbc:postgresql://localhost:5432/pipelineiq
DB_USERNAME=postgres
DB_PASSWORD=postgres

JWT_SECRET=your_jwt_secret

GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_TOKEN=your_github_pat

AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

FRONTEND_URL=http://localhost:3000
```

> Never commit real API keys, OAuth secrets, JWT secrets, or GitHub tokens to the repository.

---

# 🤖 AI Configuration

PipelineIQ currently supports AI provider selection through:

```env
AI_PROVIDER=groq
```

Current working model:

```env
GROQ_MODEL=openai/gpt-oss-20b
```

Groq uses an OpenAI-compatible API.

The current working configuration was verified with the AI analysis flow successfully generating and persisting real AI analysis.

---

# 🐳 Start Infrastructure

Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

---

# 🧠 Start AI Service

```bash
cd ai-service

python -m venv venv
```

### Windows

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

Verify:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

---

# 🚀 Start Backend

Build and start the backend:

```bash
docker compose up --build -d backend
```

Check backend logs:

```bash
docker logs -f pipelineiq-api
```

Check application health:

```powershell
Invoke-RestMethod http://localhost:8081/actuator/health
```

---

# 🗄 PostgreSQL

Enter PostgreSQL:

```bash
docker exec -it pipelineiq-db psql -U pipelineiq -d pipelineiq
```

---

# 🔄 Normal Docker Workflow

```bash
docker compose down
docker compose up
```

For GitHub webhook development:

```bash
ngrok http 8081
```

---

# 🚨 Emergency Clean Rebuild

Use only when necessary:

```bash
docker compose down -v

docker system prune -a -f

docker compose build --no-cache

docker compose up
```

> `docker compose down -v` removes persistent Docker volumes. Use it carefully because database data may be deleted.

---

# 🔐 GitHub OAuth

Start the GitHub OAuth flow through:

```text
/api/v1/auth/github/login
```

---

# 📁 Core APIs

## Repositories

### Add Repository

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

### Sync Repository

```http
POST /api/v1/repositories/{id}/sync
```

---

# 🏃 Pipeline Runs

### Get Runs

```http
GET /api/v1/repositories/{id}/runs
```

### Get Run Details

```http
GET /api/v1/repositories/{id}/runs/{runId}
```

---

# 🤖 AI Analysis

### Analyze Failed Run

```http
POST /api/v1/repositories/{repoId}/runs/{runId}/analysis
```

> The correct endpoint is `/analysis`, not `/analyse`.

Example:

```http
POST /api/v1/repositories/3/runs/28/analysis
```

### Get Analysis Result

```http
GET /api/v1/repositories/{repoId}/runs/{runId}/analysis
```

---

# 🧠 AI Analysis Pipeline

The current AI flow is:

```text
Pipeline Run
     ↓
Fetch GitHub Logs
     ↓
PipelineAnalysisOrchestrator
     ↓
Failure Classification
     ↓
AiAnalysisService
     ↓
AiProviderClient
     ↓
Groq / OpenAI-Compatible API
     ↓
Parse Structured Response
     ↓
Persist RunAnalysis
     ↓
React AI Insights
```

The core AI integration is already functional and should not be rebuilt from scratch.

---

# 🧩 Failure Analysis

PipelineIQ can classify and analyze failures such as:

* Build failures
* Test failures
* Dependency failures
* Docker failures
* Infrastructure failures
* Network failures
* Configuration failures
* Intentional/test failures

---

# 🎯 Developer-Focused AI Diagnosis

The target AI output is structured around:

```text
Failure Summary
       ↓
Root Cause
       ↓
Affected File
       ↓
Failed Step
       ↓
Problematic Code
       ↓
Why It Failed
       ↓
Exact Fix
       ↓
Replacement Code
       ↓
Verification
```

For example:

```text
FILE
.github/workflows/pipelineiq-ai-test.yml

PROBLEMATIC CODE
exit 1

WHY
The command intentionally returns a non-zero
exit status, causing GitHub Actions to mark
the step as failed.

FIX
Remove the exit 1 command if the failure
is not intentional.

OR REPLACE WITH

exit 0

VERIFICATION
Run the workflow again and verify that the
job completes successfully.
```

This is the direction of the AI intelligence layer: **precise, actionable debugging rather than generic recommendations.**

---

# 🗄 Database Entities

Core entities include:

* `User`
* `MonitoredRepository`
* `PipelineRun`
* `PipelineStage`
* `FailureRecord`
* `RunAnalysis`

AI analysis results are persisted in PostgreSQL through the `run_analysis` table.

---

# 📊 Frontend

The React application currently provides:

* Dashboard
* Repository management
* Pipeline runs
* AI Insights
* Notifications
* Settings
* Dark/light theme
* Analytics

The AI Insights page displays the generated analysis returned by the backend.

---

# 🧪 AI Test Workflow

PipelineIQ includes a dedicated GitHub Actions workflow for testing failure analysis:

```text
.github/workflows/pipelineiq-ai-test.yml
```

The workflow intentionally fails:

```yaml
- name: Intentional PipelineIQ AI Test Failure
  run: |
    echo "PIPELINEIQ_AI_TEST_FAILURE"
    echo "This failure is intentional and is used to test PipelineIQ AI analysis."
    exit 1
```

This allows the complete ingestion → analysis → AI → persistence → frontend flow to be tested safely.

The normal CI workflow remains separate and should not intentionally fail.

---

# 🔄 End-to-End Flow

```text
1. GitHub Actions workflow runs
              ↓
2. Workflow succeeds or fails
              ↓
3. PipelineIQ ingests the run
              ↓
4. Failed run logs are retrieved
              ↓
5. Failure is classified
              ↓
6. AI analysis is triggered
              ↓
7. Context is sent to the LLM
              ↓
8. Structured diagnosis is generated
              ↓
9. Analysis is stored in PostgreSQL
              ↓
10. React displays developer insights
```

---

# 📈 Current Project Status

## Backend

* ✅ Spring Boot backend
* ✅ Multi-module architecture
* ✅ GitHub OAuth
* ✅ JWT authentication
* ✅ GitHub Actions ingestion
* ✅ Pipeline run tracking
* ✅ Failure classification
* ✅ AI analysis API
* ✅ PostgreSQL persistence
* ✅ Redis integration
* ✅ Webhook/polling architecture
* ✅ Maven build verified successfully

## AI

* ✅ Groq integration
* ✅ OpenAI-compatible provider architecture
* ✅ Real LLM analysis
* ✅ Structured AI responses
* ✅ Failure classification
* ✅ Root cause analysis
* ✅ Remediation recommendations
* 🚧 More precise file/code-level remediation being improved
* 🚧 Rich repository/workflow context for the LLM

## Frontend

* ✅ Dashboard
* ✅ Repository management
* ✅ Pipeline runs
* ✅ AI Insights
* ✅ Notifications
* ✅ Settings
* ✅ Dark/light theme
* ✅ Analytics

---

# 🚧 Roadmap

### AI Intelligence

* [ ] Exact file/line identification
* [ ] Code-aware remediation
* [ ] Replacement code generation
* [ ] Repository context retrieval
* [ ] Similar failure intelligence
* [ ] Confidence scoring improvements
* [ ] AI-generated verification commands

### Platform

* [ ] Vector similarity search
* [ ] Slack notifications
* [ ] Email notifications
* [ ] Real-time WebSockets
* [ ] Kubernetes deployment
* [ ] AWS production deployment
* [ ] Multi-user organizations
* [ ] AI remediation automation

---

# ⚠️ Known Limitations

Current areas still under development include:

* Kubernetes deployment
* Vector database integration
* Slack/email notifications
* Real-time WebSocket updates
* Multi-user organization support
* Advanced repository-aware AI remediation

---

# 🐳 Docker Commands

Build and start:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

View backend logs:

```bash
docker logs -f pipelineiq-api
```

---

# 👨‍💻 Author

**Ayush Jindal**

GitHub:

https://github.com/ayushjindal026

---

# ⭐ Support

If you find PipelineIQ useful, consider starring the repository.

Built to make CI/CD debugging faster, more intelligent, and more actionable. 🚀
