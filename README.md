# AIScoreAnalysis - AI 成绩分析工具

## 1. 项目概述

### 项目目的
一款专为学生设计的智能成绩分析工具。用户只需上传成绩截图或照片，AI 即可自动识别成绩数据，结合学生所在城市和年级，提供个性化的学习分析和提升建议。

### 核心体验
简单三步——导入/录入成绩 → 确认数据 → 获取分析。零门槛，即用即走。

### 情感定位
温暖、专业、鼓励性。不是冷冰冰的数据报告，而是像一位耐心的学长/学姐在帮助你分析学习情况。

---

## 2. 技术实现

### 技术栈
| 类别 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + Vite | 快速开发，热更新 |
| 样式方案 | Tailwind CSS | 原子化CSS，响应式 |
| AI OCR | 阿里百炼 qwen-vl-max-latest | 图像识别，支持base64 |
| AI 分析 | 阿里百炼 qwen-max-latest | 文本深度分析 |
| 图标 | Lucide React | 轻量级图标库 |
| 状态管理 | React useState | 轻量级状态管理 |

### 项目结构
```
aiscoreanalysis/
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
3. **Step 2 - 分析结果**: 查看AI分析、选科建议、调试依据

---

## 3. AI 服务商配置

### 当前配置 (App.jsx)
```javascript
AI_PROVIDERS = {
  aliyun: {
    name: '阿里百炼',
    apiKey: 'sk-7e50288cd0d549e98ff4d8ed4bf2a399',
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
