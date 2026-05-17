# AIScoreAnalysis FastAPI Backend

This service is the Docker-ready backend for the WeChat mini program MVP. It keeps AI provider keys on the server side and exposes structured APIs for score OCR and report generation.

## Local Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Health check:

```bash
curl http://127.0.0.1:8080/api/health
```

Parse a score description into structured data:

```bash
curl -X POST http://127.0.0.1:8080/api/parse-score-text \
  -H "content-type: application/json" \
  -d "{\"text\":\"高一期中考试，数学108分，英语126分，物理78分，化学82分\",\"student\":{\"grade\":\"高一\",\"city\":\"杭州\"},\"exam\":{\"name\":\"期中考试\",\"date\":\"2026-05-13\"}}"
```

Generate the current rule-based mock report:

```bash
curl -X POST http://127.0.0.1:8080/api/analyze-score \
  -H "content-type: application/json" \
  -d "{\"student\":{\"grade\":\"高一\",\"city\":\"杭州\"},\"exam\":{\"name\":\"期中考试\",\"date\":\"2026-05-13\"},\"subjects\":[{\"name\":\"数学\",\"score\":108,\"full_score\":150},{\"name\":\"英语\",\"score\":126,\"full_score\":150}]}"
```

## Docker Run

```bash
cd backend
docker build -t ai-score-api .
docker run -p 8080:8080 --env-file .env ai-score-api
```

On Windows, Docker Desktop must have a running Linux engine. If `docker info`
returns a Docker Desktop Linux engine 500 error, enable WSL2 and the Windows
Virtual Machine Platform from an elevated PowerShell session, then restart
Windows and Docker Desktop.

If Docker Hub is unreachable from the local network, build with an alternative
Python base image:

```bash
docker build --build-arg BASE_IMAGE=mcr.microsoft.com/devcontainers/python:1-3.11-bullseye -t ai-score-api .
```

For a smaller Python image through a Docker Hub proxy:

```bash
docker build --build-arg BASE_IMAGE=docker.m.daocloud.io/library/python:3.11-slim -t ai-score-api .
```

## Environment

Copy `.env.example` to `.env` for local use. Do not commit `.env`.

```text
DASHSCOPE_API_KEY=your Aliyun Bailian API key
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
OCR_MODEL=qwen3.6-flash
ANALYZE_MODEL=qwen3.6-flash
DATABASE_URL=
```

For WeChat CloudBase Run, set the container port to `8080` and configure the same environment variables in the service settings.
