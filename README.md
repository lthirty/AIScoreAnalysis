# AIScoreAnalysis - AI 成绩分析工具

## 1. 项目概述

### 项目目的
一款专为学生设计的智能成绩分析工具。用户只需上传成绩截图或照片，AI 即可自动识别成绩数据，结合学生所在城市和年级，提供个性化的学习分析和提升建议。

### 核心体验
简单三步——导入/录入成绩 → 确认数据 → 获取分析。零门槛，即用即走。

### 当前版本
- 小程序主线版本：`3.0.15`
- 构建日期：`2026-05-16`
- 构建号：`20260516-13`

### 当前主线
当前可运行主线已经从 Web 原型扩展为微信原生小程序 MVP：`miniprogram-native/` 负责微信小程序前端，`backend/` 提供 FastAPI 后端，后端通过 Docker 部署到微信云开发 CloudBase 云托管。AI Key 只保存在云托管环境变量中，小程序通过 `wx.cloud.callContainer` 调用 `ai-score-api`。

### 情感定位
温暖、专业、鼓励性。不是冷冰冰的数据报告，而是像一位耐心的学长/学姐在帮助你分析学习情况。

---

## 2. 技术实现

### 技术栈
| 类别 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + Vite | 快速开发，热更新 |
| 小程序前端 | 微信原生小程序 | 当前 MVP 主线，目录 `miniprogram-native/` |
| 后端服务 | FastAPI + Uvicorn | 目录 `backend/`，提供 OCR、解析和报告接口 |
| 部署平台 | 微信云开发 CloudBase 云托管 | 服务名 `ai-score-api`，容器端口 `8080` |
| 样式方案 | Tailwind CSS | 原子化CSS，响应式 |
| AI OCR | 阿里百炼 qwen-vl-max-latest | 图像识别，支持base64 |
| AI 分析 | 阿里百炼 qwen-max-latest | 文本深度分析 |
| 图标 | Lucide React | 轻量级图标库 |
| 状态管理 | React useState | 轻量级状态管理 |

### 项目结构
```
aiscoreanalysis/
├── docs/
│   └── wechat-miniprogram-migration.md  # 微信小程序正式迁移方案
├── backend/              # FastAPI 后端，Docker 化部署到 CloudBase 云托管
├── deploy/cloudbase/     # CloudBase 部署说明和本地生成的部署包位置
├── miniprogram-native/   # 微信原生小程序 MVP
├── miniprogram/          # Taro 微信小程序迁移骨架
├── server/               # 微信登录、成绩记录、AI分析后端骨架
├── src/
│   ├── App.jsx          # 主组件（约1800行，包含所有业务逻辑）
│   ├── version.js       # 版本信息与修改记录
│   ├── main.jsx         # 入口文件
│   └── index.css        # Tailwind 样式
├── dist/                # 构建输出目录
├── index.html           # HTML模板
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md            # 项目文档（本文件）
```

### 页面流程
1. **Step 0 - 录入方式**: 选择上传截图或手动输入
2. **Step 1 - 确认成绩**: 核对OCR识别结果或编辑手动输入
3. **Step 2 - 分析结果**: 查看 AI 基础分析、结构化选科建议、历史趋势和家长建议
4. **Step 3 - AI增强分析**: 先展示付费解锁卡片，解锁后才允许导入试卷照片或手动输入题型得分并生成增强分析

### 当前报告页行为
- **AI 基础分析**：展示总分、平均分、各科对比、优势/薄弱科目、优先提升、学习建议、下次目标和家长建议。
- **选科建议**：参考 Web 端策略，直接给出推荐组合，并展示推荐依据、其他备选建议及依据、下一步验证动作。
- **AI 增强分析**：未解锁前只展示高亮付费转化模块，不展示材料录入区；解锁后才显示试卷照片上传和手动输入入口，避免客户在未付费状态提前进入深度分析流程。
- **导出内容**：如果仅有简要分析，导出图片/PDF 只包含简要分析；如果已生成 AI 增强分析，导出会同时包含简要和深入分析。
- **缺少数据处理**：开始增强分析前会检查缺少学科并弹窗确认；缺少数据的学科会在结果里直接显示“由于缺少数据，因此无法进行深入分析”。
- **异常恢复提示**：增强分析若遇到异常，会自动回退到规则报告，并提示返回后重新进入通常可以很快继续执行。
- **版本展示**：首页、录入页、确认页和报告页底部统一展示当前小程序版本号，便于现场排查和回归验证。
- **长耗时反馈**：OCR、基础报告和增强分析全部采用分步骤进度遮罩，明确展示“上传数据 → 连接 AI 大模型 → AI 处理中 → 结果回传”等状态，避免用户误以为页面卡死。
- **部署注意**：如果通过 `deploy/cloudbase/ai-score-api-source.zip` 上传 CloudBase 云托管，后端改动后必须同步重打该 zip 再部署。

---

## 3. AI 服务商配置

### 当前生产配置
生产环境使用 `backend/` 读取环境变量，不在前端代码中保存密钥：

```text
DASHSCOPE_API_KEY=your Aliyun Bailian API key
DASHSCOPE_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
OCR_MODEL=qwen-vl-max-latest
ANALYZE_MODEL=qwen-max-latest
```

### Web 原型配置 (App.jsx)
```javascript
AI_PROVIDERS = {
  aliyun: {
    name: '阿里百炼',
    apiKey: '配置在本地环境或服务端环境变量中，禁止提交真实 Key',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-vl-max-latest',   // 图像识别模型
    supportsVision: true
  },
  minimax: { supportsVision: false },
  deepseek: { supportsVision: false }
}

ANALYSIS_PROVIDER = {
  name: '阿里百炼',
  model: 'qwen-max-latest'         // 文本分析模型
}
```

### OCR 实现 (App.jsx runOcr 函数)
```javascript
// 图片格式：image_url 对象格式（阿里百炼兼容）
messages: [{
  role: 'user',
  content: [
    { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } },
    { type: 'text', text: buildOcrPrompt(type) }
  ]
}]
```

### 分析实现 (App.jsx runDeepAnalysis 函数)
```javascript
// 文本分析，使用 qwen-max-latest
messages: [{
  role: 'user',
  content: buildDeepAnalysisPrompt(...)
}]
```

### 微信小程序正式链路

```text
文字录入 -> /api/parse-score-text -> 确认成绩 -> /api/analyze-score-job -> 轮询报告结果
截图识别 -> wx.cloud.uploadFile -> wx.cloud.getTempFileURL -> /api/ocr-score-job -> 轮询 OCR 结果 -> 确认成绩
```

同步接口仍保留用于调试，但小程序端优先使用任务接口，避免微信云托管同步调用超时。

---

## 4. 曾遇到的问题及解决方案

### 问题1：DeepSeek OCR 图像识别失败（400 Bad Request）
**原因**：DeepSeek 不支持 OpenAI 的 `image_url` 对象格式
```javascript
// 错误格式
content: [{ type: 'image_url', image_url: { url: `data:image/png;base64,...` } }]

// 正确格式（内嵌在文本中）
content: `Extract grades... Image: data:image/png;base64,${base64Image}`
```

### 问题2：MiniMax API 图像理解不可用
**原因**：MiniMax-Text-01 模型不支持图像理解
- 测试过的端点：`/v1/text/chatcompletion_v2`
- 测试过的模型：`MiniMax-Text-01`, `abab6.5s-chat`, `minimax-vl-01` 等
- 结果：均返回 "token plan not support model" 或 404
- **结论**：当前 API Key 无法使用 MiniMax 图像理解功能

### 问题3：MiniMax 返回 choices: null 导致崩溃
**错误**：`Cannot read properties of null (reading '0')`
**解决方案**：
```javascript
if (data.choices && data.choices[0]?.message?.content) {
  content = data.choices[0].message.content
} else if (data.base_resp?.status_code !== 0) {
  throw new Error(`API错误: ${data.base_resp.status_msg}`)
} else {
  continue  // 跳过空响应
}
```

### 问题4：排名数字混入分数
**原因**：OCR 提示词不够明确，导致班级排名/年级排名数字被误识别为分数
**解决方案**：
- 强化 `buildOcrPrompt` 函数中的规则
- 明确区分成绩列与排名列
- 增加人工确认步骤

### 问题5：腾讯云账号与小程序归属不一致
**现象**：`wx.cloud.callContainer` 报 `Invalid host` 或 `-606001`。
**原因**：小程序 AppID 与 CloudBase 环境不在同一个已关联的腾讯云账号体系内。
**解决方案**：统一微信公众平台和腾讯云 CloudBase 账号到 `100048832005`，在微信开发者工具中创建并识别可用云开发环境，环境 ID 为 `ai-score-prod-d8gei4o0y0d5064bc`。

### 问题6：云托管默认域名不能作为正式 request 合法域名
**现象**：微信公众平台提示云托管默认域名仅用于测试，不能配置为正式服务器域名。
**解决方案**：正式链路改用 `wx.cloud.callContainer`，不再依赖 `wx.request` 直连默认域名。

### 问题7：图片 base64 超过 callContainer 请求体限制
**现象**：图片 OCR 报 `input data size too large (> 100KB)`。
**原因**：`callContainer` 单次请求体限制较小，base64 会进一步膨胀。
**解决方案**：小程序改为先 `wx.cloud.uploadFile` 上传云存储，再 `wx.cloud.getTempFileURL` 获取短链接，后端通过临时 URL 下载原图后交给百炼 OCR。

### 问题8：OCR 和 AI 报告生成同步等待超时
**现象**：`cloud.callContainer:fail 102002`，提示请求超时。
**原因**：原图 OCR 和 AI 报告生成耗时超过微信云托管同步调用等待窗口。
**解决方案**：后端新增异步任务接口：`/api/ocr-score-job`、`/api/analyze-score-job`。小程序提交任务后每 2 秒轮询状态，完成后再进入确认页或报告页。

### 问题9：小程序 OCR 精度低于 Web 原型
**原因**：为提速曾改用 `qwen-vl-ocr-latest` 并压缩图片，导致表格小字信息损失。
**解决方案**：恢复到 Web 原型更接近的路径：原图上传、后端不二次压缩、OCR 模型使用 `qwen-vl-max-latest`。

### 问题10：AI 报告生成期间屏幕闪烁
**原因**：按钮 loading 与轮询状态叠加，造成页面视觉频繁刷新。
**解决方案**：确认页改为固定遮罩展示“正在生成 AI 报告”，按钮仅禁用，不再使用按钮内 loading 动画。

### 问题11：AI 识别和分析过程耗时长，用户误以为卡死
**现象**：OCR、基础报告和增强分析耗时较长时，用户无法判断系统是否还在继续处理。
**解决方案**：
- OCR、基础报告和增强分析统一改成分步骤进度遮罩；
- 明确提示“上传数据”“连接 AI 大模型”“AI 处理中”“结果回传”等状态；
- 通过长轮询和静默重试减少直接失败弹窗。

### 问题12：历史成绩管理卡片信息和按钮挤在同一行
**现象**：成绩概要和“编辑/删除”按钮挤在一行，移动端阅读和点击都不稳定。
**解决方案**：改为两行布局，上面单独展示考试概要、日期和总分，下面再展示“编辑/删除”按钮。

---

## 5. 核心函数

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `runOcr` | App.jsx:1323 | OCR图片识别 |
| `runDeepAnalysis` | App.jsx:1376 | AI深度分析 |
| `buildAnalysis` | App.jsx:1124 | 本地计算分析结果 |
| `buildOcrPrompt` | App.jsx:1002 | 构建OCR提示词 |
| `buildDeepAnalysisPrompt` | App.jsx:1026 | 构建分析提示词 |
| `extractJsonPayload` | App.jsx:1055 | 提取JSON响应 |
| `normalizeOcrPayload` | App.jsx:1076 | 标准化OCR数据 |
| `normalizeSubject` | App.jsx:980 | 标准化科目名称 |
| `generateSubjectSelection` | App.jsx:159 | 高中选科建议 |

---

## 6. 数据模型

```typescript
interface Score {
  subject: string;      // 科目名称
  score: number;        // 分数
  fullScore: number;    // 满分，默认100
}

interface StudentInfo {
  city: string;         // 城市
  grade: string;        // 年级
}

interface AnalysisResult {
  average: number;       // 平均分
  totalScore: number;    // 总分
  maxTotalScore: number;  // 最高分总分
  ranking: string;       // 排名估算
  classRank: number;     // 班级排名
  gradeRank: number;     // 年级排名
  strengths: Array<{subject, score, diff, maxScore}>;  // 优势科目（含分差）
  weaknesses: Array<{subject, score, diff, maxScore}>; // 弱势科目（含分差）
  suggestions: string[];  // 建议
  modelTrace: { visionModel, analysisModel };  // AI模型追踪
}
```

---

## 7. 设计规范

### 色彩系统
| 名称 | 色值 | 用途 |
|------|------|------|
| Primary | #6366F1 | 主按钮、进度指示 |
| Secondary | #8B5CF6 | 次要强调 |
| Accent | #06B6D4 | 活力强调 |
| Success | #10B981 | 成功状态、优势科目 |
| Warning | #F59E0B | 警告状态、待提升科目 |
| Background | #F8FAFC | 页面背景 |

### 字体
- 主字体：`"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- 数字字体：`"DIN Alternate", "Roboto", sans-serif`

### 间距系统
- 基础单位：4px
- 卡片圆角：16px
- 按钮圆角：12px

### 动效
- 页面过渡：300ms ease-out
- 卡片悬停：scale(1.02), 200ms
- 按钮点击：scale(0.98), 100ms

---

## 8. 各省市满分数据

### 数据来源
- **方案1（辅助）**：本地 `getFullScoreData()` 函数存储的各省市高考/中考满分数据
- **方案2（主）**：AI根据城市+年级+科目推断满分

### 满分数据表 (App.jsx)
```javascript
// 高中（全国卷/北京/上海/浙江）
FULL_SCORES = {
  语文: 150, 数学: 150, 英语: 150,
  物理: 100, 化学: 100, 生物: 100,
  历史: 100, 地理: 100, 政治: 100
}

// 初中
JUNIOR_FULL_SCORES = {
  语文: 120, 数学: 120, 英语: 120,
  物理: 100, 化学: 100,
  历史: 100, 地理: 100, 政治: 100
}

// 小学
PRIMARY_FULL_SCORES = {
  语文: 100, 数学: 100, 英语: 100
}
```

---

## 9. AI 深度分析提示词

### 提示词设计原则
1. 角色设定：资深高考成绩分析专家
2. 只传递原始数据，让AI独立分析
3. 提供本地初步建议作为参考（选科建议）
4. 输出格式统一，便于前端解析

### 提示词结构 (App.jsx buildDeepAnalysisPrompt)
```javascript
// 输入：学生信息 + 原始成绩 + 满分参考 + 本地分析建议
// 输出：6段式报告
1、核心诊断
2、各科分差分析
3、选科建议（高中生必填）
4、提分优先级
5、具体可执行建议
6、阶段目标
```

### 输出格式要求
- 使用数字编号（1、2、3）替代 **符号
- 每项控制在200字以内
- 语言通俗易懂，适合家长和学生阅读
- 选科建议需与本地建议保持方向一致

---

## 10. 版本信息

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 3.0.15 | 2026-05-16 | 修正增强分析页“手动输入”模式按钮超出屏幕的问题；增强分析异常回退时改为友好提示并补充“返回后重新进入通常可以很快继续执行”的说明；后端增强分析继续统一回退到规则报告，避免把 pydantic 校验错误直接暴露给前端；版本记录同步升级 |
| 3.0.14 | 2026-05-16 | 导出图片/PDF在已生成增强分析时同时包含简要和深入分析内容；增强分析开始前弹窗检查缺少学科并允许继续分析；缺少数据科目在结果里统一显示“由于缺少数据，因此无法进行深入分析”；去除待分析材料卡片删除按钮；版本记录同步升级 |
| 3.0.13 | 2026-05-16 | 增强分析在后端 AI 输出校验失败时改为友好兜底，不再把 pydantic 原始错误直接暴露给前端；增强分析页在失败后会自动切换规则兜底结果，并给出任务状态、耗时和失败原因；修复增强分析页 WXML 中耗时文本的非法表达式，避免页面直接编译报错；增强分析增加调试信息，展示任务状态、等待时长、材料数量和图片数量，便于定位 AI 缓慢原因；增强分析页补充 subject_insights、核心诊断、执行计划、阶段目标、风险提醒和补充材料等深度内容；增强分析失败时自动回退规则兜底报告，避免客户点开始分析后看到空白页；微信小程序版本号升级到 v3.0.13 · 2026-05-16，便于开发者工具确认当前修改已生效 |
| 3.0.0 | 2026-05-15 | 微信小程序首页、录入页、确认页和报告页统一增加版本号；文字录入默认成绩示例改为九门学科且考试名称默认留空；OCR、基础报告和增强分析全部改为分步骤进度提示；基础报告和增强分析轮询改成长等待与静默重试，尽量避免云端较慢时直接弹出失败提示；历史成绩管理卡片改为“两行布局：成绩概要在上，编辑/删除按钮在下” |
| 2.0.2 | 2026-05-15 | AI 基础分析页删除“学科表现”模块；高中选科建议改为直接给出推荐组合、推荐依据、其他备选建议及依据、下一步验证动作；AI 增强分析改为参考 Web 端的高亮付费解锁卡片，未解锁前不展示试卷照片和手动输入入口，解锁后才进入增强分析材料录入；后端 `ScoreReport` 新增结构化 `elective_plan` 字段并强化 AI 提示词；同步重打 `deploy/cloudbase/ai-score-api-source.zip` 供 CloudBase 部署 |
| 2.0.1 | 2026-05-15 | 优化微信小程序首页：主文案改为“3分钟看懂成绩，5分钟生成诊断报告”，录入成绩改为高亮主入口；AI模型配置默认收缩并显示“系统默认：阿里百炼”；使用流程和历史趋势支持点击首行展开/收缩；最近报告入口移入历史趋势；城市与教育局改为附录并支持打开官网和复制网址；后端支持按请求覆盖模型/API配置，并对 AI 报告失败提供规则报告兜底 |
| 2.0.0 | 2026-05-14 | 完成微信原生小程序 MVP 与 FastAPI 后端；后端 Docker 化部署到微信云开发 CloudBase 云托管；正式链路使用 `wx.cloud.callContainer`；图片 OCR 改为云存储中转；OCR 和 AI 报告生成改为异步任务轮询；修复 AI 报告生成期间屏幕闪烁；整理部署问题和处理措施 |
| 1.9.1 | 2026-05-12 | 明确转向微信小程序原生产品设计；新增小程序产品与交互设计文档；补充视觉规范和 design tokens；调整小程序首页为微信账号与录入成绩工作台结构 |
| 1.9.0 | 2026-05-12 | 新增微信小程序正式迁移方案文档；新增 Taro 小程序端骨架；新增后端服务、OCR上传、AI分析、数据库 schema 和 AI Key 服务端化边界；明确 10K 用户/10 并发及扩展到 100K 用户/100 并发的架构要求 |
| 1.8.7 | 2026-05-12 | 统一返回按钮位置和文案；AI基础分析页历史趋势默认完整展开；添加学科按钮改名；AI报告清理星号并使用数字段落号；强化解答题未提供内容时不得猜测具体考点 |
| 1.8.6 | 2026-05-12 | 强化禁止无依据猜测的模型提示词；待分析学科附件支持预览、修改/重传和删除；调整添加学科按钮和说明文案 |
| 1.8.5 | 2026-05-12 | 调整确认成绩和增强分析入口位置；各科趋势深度分析支持多学科连续加入后统一模型分析；导出内容包含各科趋势深度分析结果 |
| 1.8.4 | 2026-05-12 | 各科趋势深度分析栏增加学科输入框；保持默认展开；增加开始分析按钮和页面内状态提示 |
| 1.8.3 | 2026-05-12 | 修复最大化滚动；重排首页录入流程；历史趋势默认收缩；取消浏览器弹窗；记住账号城市/年级；教育部门查询合并输入；增强分析定位和导出入口 |
| 1.8.2 | 2026-05-11 | 修复UserLogin缺少LogIn图标导入导致白屏；通过真实浏览器验证页面渲染和Rayna/Xulei模拟登录 |
| 1.8.1 | 2026-05-11 | 调试阶段微信登录改为本地模拟登录；增加本地存储用户校验；减少登录按钮默认行为干扰 |
| 1.8.0 | 2026-05-11 | 第4步命名为AI增强分析；首页显示历史趋势；考试记录可编辑/删除；异常分数仅超过学科满分时标红；移除删除全部按钮；非首页步骤增加返回上一步 |
| 1.7.9 | 2026-05-11 | 流程新增AI基础分析和增强分析分步；基础页增加AI增强分析入口与教育部门网址附录；增强页提供试卷照片/分题型输入；成绩编辑增加二次确认和异常分数标红 |
| 1.7.8 | 2026-05-11 | 趋势曲线横轴显示每次考试日期；总分趋势叠加班级/年级排名并增加右侧排名轴；趋势深度分析说明默认展开 |
| 1.7.7 | 2026-05-11 | 各科趋势说明增加学科名前缀；AI分差分析禁止编造题型失分原因，改为提示补充试卷或题型得分 |
| 1.7.6 | 2026-05-11 | 考试记录固定显示在总分趋势下方；调试依据默认收起；趋势判断改为完整序列分析；AI报告清理标题#符号 |
| 1.7.5 | 2026-05-11 | 历史趋势改为总分和各科日期-分数曲线；AI深度分析增加逐科趋势分析要求；手机端基础信息单列显示 |
| 1.6.3 | 2026-05-11 | 修复nextAnalysis未定义错误；新增满分数据表；AI提示词增加满分参考 |
| 1.6.2 | 2026-05-11 | 核心诊断改为数字编号；显示全部科目；优化AI提示词格式 |
| 1.6.1 | 2026-05-11 | 修复runDeepAnalysis错误；README更新架构文档 |
| 1.6.0 | 2026-05-11 | 合并ScoreEditor为CombinedScoreEditor；优势科目显示分差 |
| 1.5.0 | 2026-05-11 | 手动输入模式改为在首页直接录入并生成分析；新增数据分析模型；新增调试依据展示 |
| 1.4.0 | 2026-05-08 | 首页整理为紧凑工作台布局；高中阶段新增选科建议 |
| 1.3.0 | 2026-05-08 | 切换为阿里百炼 qwen-vl-max-latest；城市/年级差异化判断 |
| 1.2.0 | 2026-05-07 | 双图片区分（个人成绩/最高分）；OCR后人工确认步骤 |
| 1.0.0 | 2026-05-07 | 初始版本，集成 DeepSeek OCR |

---

## 11. 后续维护

### 必须遵守
- 每次修改代码、文档或构建产物后，必须同步升级版本号。
- 每次修改后必须记录修改内容，优先写入 `src/version.js` 的 `CHANGELOG`，必要时同步更新本 README。
- 每次修改并验证通过后，必须同步提交并推送到 GitHub 仓库：`https://github.com/lthirty/AIScoreAnalysis`。

### 待完成功能
- [ ] 微信小程序版本
- [ ] 付费深度分析功能（实际支付）
- [ ] PDF 报告生成与下载
- [ ] MiniMax VLM 图像理解（端点已知 `/v1/coding_plan/vlm`，格式待确认）
- [ ] 完善各省市满分数据表

### API Key 管理
- **阿里百炼**：当前主要 OCR 和分析服务提供商
- **DeepSeek**：已禁用图像支持（架构已迁移到阿里百炼）
- **MiniMax**：API 套餐限制，图像理解暂不可用

### 常用命令
```bash
npm run dev      # 开发服务器（主线：5173，claude：5174）
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

### 分支说明
- `main`: 主线分支，稳定版本
- `claude`: 开发分支，用于功能开发和测试（已完成合并）
