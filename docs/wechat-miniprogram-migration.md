# 微信小程序正式迁移方案

## 1. 迁移目标

当前项目是 React + Vite 的 Web 单页应用，不能直接作为微信小程序运行。正式迁移采用方案 B：新建原生小程序兼容工程，复用现有纯业务逻辑，把登录、数据存储、AI OCR、AI 分析全部移到后端服务。

目标能力：

| 阶段 | 用户规模 | 成绩记录规模 | 并发目标 | 架构要求 |
| --- | --- | --- | --- | --- |
| v1 上线 | 10K 用户 | 约 300K 次考试记录，约 2.7M 科目分数行 | 10 人同时使用 | 单一区域后端 + 托管数据库 + 对象存储 |
| 扩展阶段 | 100K 用户 | 约 3M 次考试记录，约 27M 科目分数行 | 100 人同时使用 | 多实例后端 + 连接池 + 缓存 + AI 任务队列 |

容量估算按每个用户最多保留 30 次考试、每次 9 科计算。正式产品不应只依赖小程序本地缓存。

## 2. 推荐总体架构

```text
微信小程序
  -> wx.login 获取临时 code
  -> 后端换取 openid 并签发业务 token
  -> 上传成绩截图/最高分截图/试卷附件
  -> 后端调用阿里百炼 OCR 和分析模型
  -> 数据库存储用户、考试记录、科目分数、AI报告

后端服务
  -> Auth API
  -> Exam Records API
  -> OCR API
  -> Analysis API
  -> Export API
  -> AI 调用限流与队列

数据层
  -> PostgreSQL 或 MySQL
  -> Redis 可选，用于登录态缓存、接口限流、AI任务状态
  -> 对象存储，用于截图、试卷附件、导出报告
```

## 3. 为什么不能把 AI Key 放小程序端

小程序包可以被反编译，任何写在前端的阿里百炼、MiniMax、DeepSeek Key 都会泄露。正式版必须改成：

```text
小程序端只调用自有后端
后端读取环境变量中的 AI Key
后端调用 qwen-vl-max-latest / qwen-max-latest
后端返回结构化结果
```

当前 Web 端的内置 Key 只能用于本地调试，不可进入正式小程序包。

## 4. 小程序端迁移步骤

1. 在 `miniprogram/` 下维护 Taro 小程序工程。
2. 先实现模拟登录和手动输入成绩，验证页面流程。
3. 接入 `wx.login`，由后端换取 openid。
4. 用 `wx.chooseMedia` 选择成绩截图，上传到后端或对象存储。
5. 后端 OCR 返回后进入成绩确认页。
6. 成绩确认后保存考试记录并生成 AI 基础分析。
7. 付费后进入 AI 增强分析页。
8. 各科试卷附件走独立上传接口，统一提交增强分析。
9. 导出图片使用小程序 canvas；PDF 由后端生成后用 `wx.downloadFile` 和 `wx.openDocument`。

## 5. 页面拆分

| Web 当前功能 | 小程序页面 | 说明 |
| --- | --- | --- |
| 首页录入、AI服务商、历史趋势 | `pages/index` | 小程序正式版不展示 AI Key 输入，服务商由后端配置 |
| 成绩确认 | `pages/confirm` | 合并个人成绩和最高分参考 |
| AI基础分析 | `pages/basic-analysis` | 历史趋势默认展开，显示模型与计算依据 |
| AI增强分析 | `pages/enhanced-analysis` | 付费后进入，支持各科附件、统一分析、导出 |

## 6. 后端接口设计

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/auth/wechat-login` | POST | code 换 openid，签发 token |
| `/api/users/me` | GET | 获取当前用户资料与偏好 |
| `/api/users/preferences` | PUT | 保存城市、年级等偏好 |
| `/api/exam-records` | GET | 获取用户历史考试记录 |
| `/api/exam-records` | POST | 创建考试记录 |
| `/api/exam-records/:id` | PUT | 修改考试记录 |
| `/api/exam-records/:id` | DELETE | 删除考试记录 |
| `/api/ocr/score-sheet` | POST | 成绩截图 OCR |
| `/api/analysis/basic` | POST | AI 基础分析 |
| `/api/analysis/enhanced` | POST | AI 增强分析 |
| `/api/analysis/subject-trend` | POST | 各科试卷趋势深度分析 |
| `/api/exports/report-pdf` | POST | 生成 PDF 报告 |

## 7. 数据库设计

核心表：

```sql
users(id, openid, unionid, nickname, avatar_url, created_at, updated_at)
user_preferences(user_id, city, grade, updated_at)
exam_records(id, user_id, city, grade, exam_date, total_score, class_rank, grade_rank, max_total_score, created_at, updated_at)
exam_subject_scores(id, record_id, user_id, subject, score, full_score, max_score, exam_date)
analysis_reports(id, record_id, user_id, report_type, model_name, prompt_hash, content, created_at)
subject_analysis_materials(id, record_id, user_id, subject, mode, file_url, detail_text, created_at)
ai_jobs(id, user_id, job_type, status, provider, model_name, request_id, error_message, created_at, updated_at)
```

关键索引：

```sql
CREATE UNIQUE INDEX users_openid_uidx ON users(openid);
CREATE INDEX exam_records_user_date_idx ON exam_records(user_id, exam_date DESC);
CREATE INDEX exam_subject_scores_user_subject_date_idx ON exam_subject_scores(user_id, subject, exam_date);
CREATE INDEX analysis_reports_record_type_idx ON analysis_reports(record_id, report_type);
CREATE INDEX ai_jobs_user_status_idx ON ai_jobs(user_id, status, created_at DESC);
```

说明：`exam_subject_scores` 冗余 `user_id` 和 `exam_date`，是为了直接按用户、学科、日期查趋势，避免每次 join 大表。

## 8. 10K 用户和 10 并发的实现要求

最低可上线配置：

| 模块 | 建议 |
| --- | --- |
| 后端 | 1 到 2 个 Node.js 实例，单实例 1C2G 起步 |
| 数据库 | 托管 PostgreSQL/MySQL，2C4G 起步，连接池 20 到 50 |
| 对象存储 | 成绩截图、试卷附件、导出报告全部走对象存储 |
| AI调用 | 后端限流，单用户串行或小并发，避免模型 API 被打爆 |
| 缓存 | 初期可不用 Redis；登录态可 JWT，热点配置本地缓存 |
| 监控 | 接口错误率、AI耗时、数据库慢查询、对象存储上传失败率 |

10 人并发主要瓶颈不是页面，而是 AI OCR 和 AI 分析调用。建议：

1. OCR 和增强分析接口超时时间设置为 60 到 120 秒。
2. 同一用户同一时间最多 1 个增强分析任务。
3. 服务端记录 `ai_jobs`，失败可重试。
4. 前端展示“分析中”，不要重复提交。
5. 后端已预留单用户 AI 并发保护，当前用进程内计数满足单实例 10 并发；扩展到多实例和 100 并发时替换为 Redis 分布式限流。

## 9. 扩展到 100K 用户和 100 并发

扩展策略：

| 瓶颈 | 扩展方式 |
| --- | --- |
| 后端 CPU/连接数 | 水平扩容到 3 到 6 个实例，前面挂负载均衡 |
| 数据库连接 | 使用连接池，按接口限制最大连接，避免实例数增加后打满数据库 |
| AI API 并发 | 引入队列，OCR/增强分析异步化，队列按模型供应商限流 |
| 历史趋势查询 | 使用 `exam_subject_scores(user_id, subject, exam_date)` 索引，必要时缓存最近 30 条 |
| 附件存储 | 对象存储分桶或按日期路径分层 |
| 导出 PDF | 后端异步生成，完成后返回下载链接 |

当达到 100 并发时，建议新增 Redis：

```text
rate-limit:api:{userId}
rate-limit:ai:{userId}
session:{token}
job-status:{jobId}
```

同时把 AI 调用从同步 HTTP 请求改成：

```text
创建 ai_job -> 入队 -> worker 调模型 -> 写 analysis_reports -> 小程序轮询 job 状态
```

## 10. 现有代码迁移清单

可复用：

| 现有函数/常量 | 迁移位置 |
| --- | --- |
| `CITIES`, `GRADES`, `SUBJECTS` | `miniprogram/src/shared/constants.js` |
| 分数规范化与总分计算 | `miniprogram/src/shared/score.js` 与后端共享实现 |
| 趋势分析规则 | `miniprogram/src/shared/trend.js` |
| prompt 生成 | 后端 `server/src/services/prompt-builder.js` |
| AI 报告清洗规则 | 后端返回前清洗，小程序展示再兜底 |

必须重写：

| Web API | 小程序替代 |
| --- | --- |
| `window.localStorage` | `Taro.getStorageSync` / `Taro.setStorageSync` |
| `fetch` | `Taro.request` |
| `FileReader` | 后端读取上传文件，或小程序 FileSystemManager |
| `URL.createObjectURL` | 小程序临时文件路径 |
| `document.createElement('canvas')` | 小程序 canvas |
| `window.print()` | 后端生成 PDF |
| DOM SVG 图表 | canvas 图表或小程序图表组件 |

## 11. 发布前检查

1. 微信开发者工具导入 `miniprogram/dist`。
2. 后端配置 HTTPS 域名。
3. 小程序后台配置 request/upload/download 合法域名。
4. 真机测试登录、上传、OCR、历史趋势、增强分析、导出。
5. 压测后端：10 并发、100 并发两个档位。
6. 确认小程序包内没有任何 AI Key。
7. 提交审核前更新版本号和修改记录，并同步推送 GitHub。
