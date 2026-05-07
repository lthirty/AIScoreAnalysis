# AIScoreAnalysis - AI 成绩分析工具

## 1. 项目概述

### 项目目的
一款专为学生设计的智能成绩分析工具。用户只需上传成绩截图或照片，AI 即可自动识别成绩数据，结合学生所在城市和年级，提供个性化的学习分析和提升建议。

### 核心体验
简单三步——上传成绩 → 选择城市年级 → 获取分析。零门槛，即用即走。

### 情感定位
温暖、专业、鼓励性。不是冷冰冰的数据报告，而是像一位耐心的学长/学姐在帮助你分析学习情况。

---

## 2. 技术实现

### 技术栈
| 类别 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + Vite | 快速开发，热更新 |
| 样式方案 | Tailwind CSS | 原子化CSS，响应式 |
| AI OCR | DeepSeek Chat | base64图像嵌入格式 |
| 图标 | Lucide React | 轻量级图标库 |
| 状态管理 | React useState | 轻量级状态管理 |

### 项目结构
```
aiscoreanalysis/
├── src/
│   ├── App.jsx          # 主组件（所有业务逻辑）
│   ├── version.js       # 版本信息与修改记录
│   ├── main.jsx         # 入口文件
│   └── index.css        # Tailwind 样式
├── dist/                # 构建输出目录
├── index.html           # HTML模板
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── SPEC.md              # 项目文档（本文件）
```

### 页面布局
单页应用，三步骤流程：
1. **上传成绩** - 多图上传、拖拽、粘贴截图
2. **基本信息** - 选择城市和年级，预览识别结果
3. **分析结果** - 免费简单分析和付费深度分析

---

## 3. AI OCR 实现

### 当前方案：DeepSeek Chat (推荐)

**API 格式**：使用 `data:image/png;base64,...` 嵌入图片
```javascript
messages: [{
  role: 'user',
  content: `提取成绩数据... Image: data:image/png;base64,${base64Image}`
}]
```

**关键代码** (App.jsx):
```javascript
const response = await fetch(provider.endpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${provider.apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: provider.model,
    messages: [{
      role: 'user',
      content: `Extract grades from image. Return JSON. Image: data:image/png;base64,${base64Image}`
    }]
  })
})
```

### AI 服务商配置 (App.jsx)
```javascript
const AI_PROVIDERS = {
  minimax: {
    name: 'MiniMax',
    apiKey: 'sk-cp-xxx',
    endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    model: 'MiniMax-Text-01',
    supportsVision: false,  // 注意：当前不可用
    recommended: false
  },
  deepseek: {
    name: 'DeepSeek',
    apiKey: 'sk-xxx',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    supportsVision: true,
    recommended: true
  }
}
```

### API 响应解析
```javascript
const data = await response.json()

// DeepSeek 格式
if (data.choices && data.choices[0]?.message?.content) {
  content = data.choices[0].message.content
}

// MiniMax 格式（可能返回 choices: null）
else if (data.base_resp?.status_code !== 0) {
  throw new Error(`API错误: ${data.base_resp.status_msg}`)
}
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
  console.warn('Empty response:', data)
  continue  // 跳过当前图片
}
```

### 问题4：DeepSeek 识别后页面空白
**原因**：API 调用失败或解析失败时未正确处理错误边界
**解决方案**：增加 try-catch 和空值检查

### 问题5：城市/年级默认值
**需求**：默认选择"杭州"和"高一"
```javascript
const [city, setCity] = useState('杭州')
const [grade, setGrade] = useState('高一')
```

---

## 5. 设计规范

### 色彩系统
| 名称 | 色值 | 用途 |
|------|------|------|
| Primary | #6366F1 | 主按钮、进度指示 |
| Secondary | #8B5CF6 | 次要强调 |
| Accent | #06B6D4 | 活力强调 |
| Success | #10B981 | 成功状态、完成 |
| Warning | #F59E0B | 警告状态 |
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

## 6. 数据模型

```typescript
interface Score {
  subject: string;      // 科目名称
  score: number;         // 分数
  fullScore: number;     // 满分，默认100
}

interface StudentInfo {
  city: string;         // 城市
  grade: string;        // 年级
}

interface AnalysisResult {
  average: number;       // 平均分
  ranking: string;       // 排名估算
  strengths: string[];  // 优势科目
  weaknesses: string[]; // 弱势科目
  suggestions: string[];// 建议
}
```

### 分析逻辑
```javascript
// 平均分
const average = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

// 排名估算
const ranking = average > 90 ? '前5%' : average > 80 ? '前15%' : average > 70 ? '前30%' : '前50%';

// 优势科目（高于平均分20%以上）
const strengths = scores.filter(s => s.score > average + 20).map(s => s.subject);

// 弱势科目（低于平均分20%以上）
const weaknesses = scores.filter(s => s.score < average - 20).map(s => s.subject);
```

---

## 7. 版本信息

| 版本 | 日期 | 修改内容 |
|------|------|----------|
| 1.0.0 | 2026-05-07 | 初始版本发布，实现核心功能 |

**当前版本**: 1.0.0
**构建日期**: 2026-05-07

---

## 8. 后续维护

### 待完成功能
- [ ] 微信小程序版本
- [ ] 付费深度分析功能（实际支付）
- [ ] PDF 报告生成与下载
- [ ] 更多 AI 服务商支持

### API Key 管理
- DeepSeek：推荐使用，OCR 效果良好
- MiniMax：需确认图像理解 API 是否在套餐范围内

### 常用命令
```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run preview  # 预览构建结果
```