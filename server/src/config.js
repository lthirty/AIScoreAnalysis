import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  wechat: {
    appId: process.env.WECHAT_APP_ID,
    appSecret: process.env.WECHAT_APP_SECRET
  },
  aliyun: {
    apiKey: process.env.ALIYUN_API_KEY,
    endpoint: process.env.ALIYUN_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    ocrModel: process.env.OCR_MODEL || 'qwen-vl-max-latest',
    analysisModel: process.env.ANALYSIS_MODEL || 'qwen-max-latest'
  },
  limits: {
    maxExamRecordsPerUser: 30,
    aiConcurrentPerUser: 1
  }
}
