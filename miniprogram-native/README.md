# AIScoreAnalysis Native WeChat Mini Program

This is the native WeChat mini program MVP. It is intentionally separate from the existing Taro skeleton in `miniprogram/` until the native flow is verified.

## Pages

```text
pages/index    Home
pages/input    Text score input and two-slot screenshot OCR
pages/confirm  Structured score confirmation
pages/report   Latest report
pages/privacy  Privacy notes
```

## Local Backend Mode

For local backend debugging, set `utils/config.js` to:

```js
useCloudContainer: false
localBaseUrl: 'http://127.0.0.1:18080'
```

Run the backend first:

```bash
cd ../backend
uvicorn app.main:app --reload --port 18080
```

Then open `miniprogram-native/` in WeChat DevTools. For local debugging, WeChat DevTools may need request domain checks disabled.

## WeChat CloudBase Run Mode

After deploying the backend to WeChat CloudBase Run, use:

```js
useCloudContainer: true
cloudEnv: 'ai-score-prod-d3gxykezlca6c70bc'
cloudService: 'ai-score-api'
```

The request wrapper uses `wx.cloud.callContainer` and sends `X-WX-SERVICE` with the service name. AI provider keys must stay in CloudBase Run environment variables, never in mini program code.

Screenshot OCR uses `wx.uploadFile` against the CloudBase Run public default domain configured in `utils/config.js` as `publicBaseUrl`. The upload page has two slots:

```text
1. Personal score screenshot
2. Class / grade best score and ranking screenshot
```

The OCR result is normalized into `subjects` and optional `max_subjects`, then passed to `/api/analyze-score`.
