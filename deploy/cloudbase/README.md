# WeChat CloudBase Run Deployment

## Local Docker Verification

From `backend/`:

```powershell
docker build --build-arg BASE_IMAGE=docker.m.daocloud.io/library/python:3.11-slim -t ai-score-api .
docker run --rm -p 18081:8080 ai-score-api
```

Verify:

```powershell
curl http://127.0.0.1:18081/api/health
```

Expected:

```json
{"status":"ok","service":"ai-score-api","env":"development","ai_enabled":false}
```

The mini program uses asynchronous OCR/report task APIs in production to avoid `wx.cloud.callContainer` timeout limits.

## CloudBase Run Settings

Use these settings when creating or updating the service:

```text
Environment ID: ai-score-prod-d8gei4o0y0d5064bc
Service name: ai-score-api
Source directory: backend/
Dockerfile directory: backend/
Container port: 8080
Minimum instances: 0 for MVP testing, 1 for stable production
Maximum instances: 2-5 for early MVP
```

Runtime environment variables:

```text
ENV=production
PORT=8080
DASHSCOPE_API_KEY=your Aliyun Bailian API key
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
OCR_MODEL=qwen-vl-max-latest
ANALYZE_MODEL=qwen-max-latest
DATABASE_URL=
```

## CLI Deployment

Install and login:

```powershell
npm install -g @cloudbase/cli
tcb login
```

Deploy:

```powershell
tcb -e ai-score-prod-d8gei4o0y0d5064bc cloudrun deploy -s ai-score-api --port 8080 --source F:\01.AI\12.AIScoreAnalysis\backend --force
```

If your local network cannot pull Docker Hub, use the CloudBase console or a code repository deployment. The checked-in `Dockerfile` defaults to `python:3.11-slim`, which is suitable for cloud builders. The local proxy build arg is only for local verification.

## Mini Program Switch

After deployment, update `miniprogram-native/utils/config.js`:

```js
useCloudContainer: true
cloudEnv: 'ai-score-prod-d8gei4o0y0d5064bc'
cloudService: 'ai-score-api'
```

Then open `miniprogram-native/` in WeChat DevTools and verify:

```text
Home -> Input -> Confirm -> Report
```
