# AIScoreAnalysis 后端服务骨架

正式微信小程序不能在前端保存 AI Key，也不能只用本地缓存保存历史成绩。本目录提供后端服务骨架，用于支撑微信登录、考试记录、OCR、AI 分析和导出。

## 本地启动

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

## 生产部署建议

- 10K 用户 / 10 并发：1 到 2 个 Node.js 实例 + 托管 PostgreSQL/MySQL + 对象存储。
- 100K 用户 / 100 并发：3 到 6 个 Node.js 实例 + Redis + AI 任务队列 + 数据库连接池。
- OCR 和增强分析调用耗时长，达到 100 并发前必须切到异步任务。

## 安全要求

- `ALIYUN_API_KEY`、`WECHAT_APP_SECRET` 只能保存在服务端环境变量。
- 所有写入接口必须校验业务 token。
- 同一用户 AI 接口需要限流，避免重复提交和成本失控。
