# AI成绩分析微信小程序：MVP开发与部署需求文档

> 用途：本文件用于喂给 AI 编程软件，指导其基于现有项目代码开发、部署和优化“AI成绩分析与成长追踪”微信小程序。
>
> 当前阶段目标：低成本、低运维、快速上线 MVP，验证家长用户是否认为成绩分析报告“具体、有用、愿意下次继续用”。

---

## 1. 项目定位

### 1.1 产品名称建议

可选名称：

- AI成绩分析
- 学情分析助手
- 成绩成长追踪
- AI学情诊断
- 成绩复盘助手

### 1.2 推荐定位

面向初高中家长的 AI 学情分析与成长追踪工具。

核心价值不是“展示 AI 技术”，而是帮助家长：

- 看懂成绩
- 找到问题
- 明确提升优先级
- 获得可执行建议
- 跟踪阶段变化
- 辅助高中选科判断

### 1.3 小程序介绍文案

120字以内版本：

> AI成绩分析与成长追踪工具。上传成绩单即可快速生成学情分析报告，帮助家长了解孩子各科强弱、偏科情况与提升方向，支持阶段成绩追踪与高中选科参考。

### 1.4 产品主张

不要强调：

- 大模型很强
- 算法先进
- 智能预测升学结果
- 保证提分

应强调：

- 看懂分数
- 找到短板
- 明确方向
- 持续追踪
- 减少无效投入

---

## 2. 首要用户分析

### 2.1 首要用户

首要用户是“学生妈妈”，尤其是：

- 初高中学生妈妈
- 小学高年级到高中阶段家长
- 30~45岁
- 一二线城市或教育竞争较强地区
- 中度焦虑
- 愿意参与孩子学习决策
- 有一定教育消费能力
- 经常关注教育内容、提分经验、选科、高考等话题

### 2.2 用户真实需求

学生妈妈真正关心的不是“AI”，而是：

- 孩子现在到底是什么水平？
- 这次成绩问题严重吗？
- 哪一科最拖后腿？
- 是不是偏科？
- 应该先补什么？
- 要不要找老师或报班？
- 未来两三个月怎么安排？
- 高中选科有没有风险？
- 家长应该怎么管才合适？

### 2.3 核心心理

这类用户购买的不是“技术能力”，而是：

- 确定感
- 决策感
- 风险提示
- 学习方向
- 焦虑缓解

### 2.4 核心场景

主要使用场景是：

> 考试成绩公布后 15 分钟内。

典型行为：

1. 孩子成绩出来。
2. 家长情绪波动。
3. 家长想知道成绩说明了什么。
4. 家长开始问老师、问群友、搜小红书、看分数线。
5. 家长需要一个快速、客观、可信的成绩分析工具。

所以产品不是“日常学习工具”起步，而是“考试后复盘工具”起步。

---

## 3. 产品功能范围

### 3.1 MVP 必做功能

第一版只做以下功能：

1. 手动录入成绩
2. 上传成绩单图片
3. OCR识别成绩
4. OCR结果人工确认
5. 生成学情分析报告
6. 展示报告
7. 保存最近报告
8. 查看历史报告
9. 分享报告卡片
10. 隐私说明与免责声明

### 3.2 MVP 暂不做功能

第一版不要做：

- 微信支付
- 会员体系
- PDF报告
- 教培机构后台
- 学校端系统
- 多学生家庭账号
- 作文批改
- 错题本
- 学习社区
- 高价升学咨询
- 私有化模型部署
- 数据服务售卖

### 3.3 主流程

```text
首页
  ↓
选择：手动录入 / 上传成绩单
  ↓
如果上传图片：OCR识别
  ↓
用户确认和编辑成绩
  ↓
提交结构化成绩数据
  ↓
后端规则分析 + AI生成报告
  ↓
报告展示
  ↓
保存 / 分享 / 下次考试复访
```

---

## 4. 小程序页面设计

### 4.1 页面列表

```text
pages/index/index        首页
pages/input/input        手动录入
pages/upload/upload      上传成绩单
pages/confirm/confirm    OCR结果确认
pages/report/report      报告展示
pages/history/history    历史报告
pages/privacy/privacy    隐私说明
```

### 4.2 首页功能

首页只保留三个主要入口：

```text
1. 手动录入成绩
2. 上传成绩单
3. 查看历史报告
```

### 4.3 首页语言风格

面向妈妈用户，语言要直接、低焦虑、少术语。

不要写：

```text
基于大模型算法进行多维度学业能力评估
```

建议写：

```text
上传成绩单，快速看懂孩子这次考试的问题和提升方向。
```

### 4.4 报告页面结构

报告建议固定为结构化模板：

```text
1. 核心诊断
   一句话说明本次成绩主要特征。

2. 科目表现
   优势科目、风险科目、波动科目。

3. 提升优先级
   本阶段最值得先提升的 1-2 门科目。

4. 两周行动建议
   每个重点科目给出可执行动作。

5. 家长沟通建议
   给家长一句具体建议，避免制造焦虑。

6. 高中选科建议
   仅高中阶段展示，必须注明“仅供参考”。
```

---

## 5. 语音输入模拟样例

### 5.1 适合客户口头输入的版本

该样例用于测试“家长口头描述成绩”的识别与结构化能力。

注意：用户只说分数，不要主动分析。

```text
这是孩子这次高一期中英语成绩，满分150，考了108分。

听力30分，得了22分。
短对话7.5分，得了6分。
长对话7.5分，得了5分。
新闻材料7.5分，得了6.5分。
综合听力7.5分，得了4.5分。

阅读理解40分，得了28分。
A篇10分，得了8分。
B篇10分，得了10分。
C篇10分，得了5分。
D篇10分，得了5分。

完形填空20分，得了12分。
语法填空15分，得了11分。
短文改错10分，得了7分。
作文35分，得了28分。

班级平均分96分，年级平均分92分。
班级排名18名，年级排名126名。
```

### 5.2 语音输入处理要求

AI 编程软件应实现：

```text
1. 支持用户粘贴自然语言成绩描述。
2. 后端将自然语言解析为结构化 JSON。
3. 解析结果必须进入确认页。
4. 用户确认后才允许生成报告。
5. 不允许直接用未经确认的自然语言生成正式报告。
```

---

## 6. 成绩结构化数据模型

### 6.1 英语试卷示例 JSON

```json
{
  "student": {
    "grade": "高一",
    "province": "浙江",
    "school_type": "普通高中"
  },
  "exam": {
    "exam_name": "期中考试",
    "exam_date": "2026-05-10",
    "total_score": 108,
    "full_score": 150,
    "class_rank": 18,
    "class_size": 50,
    "grade_rank": 126,
    "grade_size": 600
  },
  "subjects": [
    {
      "subject_name": "英语",
      "score": 108,
      "full_score": 150,
      "class_average": 96,
      "grade_average": 92,
      "sections": [
        {
          "name": "听力",
          "score": 22,
          "full_score": 30,
          "subsections": [
            {
              "name": "短对话",
              "score": 6,
              "full_score": 7.5
            },
            {
              "name": "长对话",
              "score": 5,
              "full_score": 7.5
            },
            {
              "name": "新闻材料",
              "score": 6.5,
              "full_score": 7.5
            },
            {
              "name": "综合听力",
              "score": 4.5,
              "full_score": 7.5
            }
          ]
        },
        {
          "name": "阅读理解",
          "score": 28,
          "full_score": 40,
          "subsections": [
            {
              "name": "A篇",
              "score": 8,
              "full_score": 10
            },
            {
              "name": "B篇",
              "score": 10,
              "full_score": 10
            },
            {
              "name": "C篇",
              "score": 5,
              "full_score": 10
            },
            {
              "name": "D篇",
              "score": 5,
              "full_score": 10
            }
          ]
        },
        {
          "name": "完形填空",
          "score": 12,
          "full_score": 20
        },
        {
          "name": "语法填空",
          "score": 11,
          "full_score": 15
        },
        {
          "name": "短文改错",
          "score": 7,
          "full_score": 10
        },
        {
          "name": "作文",
          "score": 28,
          "full_score": 35
        }
      ]
    }
  ]
}
```

### 6.2 数据建模要求

后端必须定义 Pydantic 模型：

```text
ScoreInput
StudentInfo
ExamInfo
SubjectScore
SectionScore
SubsectionScore
AnalysisReport
```

要求：

```text
1. OCR结果必须先转换为 ScoreInput。
2. 语音/文字描述也必须先转换为 ScoreInput。
3. AI分析接口只接收结构化 JSON。
4. 不允许直接把用户未确认的原始文本传给最终分析模型。
5. 每个分数必须包含 score 和 full_score。
6. 可选字段包括 class_average、grade_average、rank、size。
```

---

## 7. 技术架构

### 7.1 推荐架构

```text
微信小程序
    ↓
微信云托管 FastAPI
    ↓
阿里百炼 / Qwen API
    ↓
数据库 / 云存储
```

### 7.2 前端

```text
微信原生小程序
```

不建议第一版使用复杂 UI 框架，保持轻量。

### 7.3 后端

```text
Python FastAPI
Docker
微信云托管 CloudBase Run
```

### 7.4 AI服务

```text
OCR / 图片理解：qwen-vl-max-latest
文本分析：qwen-max-latest
```

### 7.5 数据存储

MVP 阶段：

```text
1. 小程序本地缓存最近报告
2. 后端可用 SQLite 开发
3. 生产环境可接云开发数据库 / MySQL / PostgreSQL
```

后续阶段：

```text
PostgreSQL
Redis
对象存储
报告缓存
```

---

## 8. 为什么不用纯云函数

不建议用纯云函数作为主架构，原因：

```text
1. OCR + AI分析请求时间较长，可能 5-30 秒。
2. 项目已有 Python / FastAPI 逻辑，重写成 Node.js 云函数成本高。
3. 后续会有历史成绩、报告生成、分享卡片、支付等复杂逻辑。
4. 云函数适合轻量事件，不适合承载完整业务后端。
```

推荐：

```text
微信云托管 + FastAPI + Docker
```

---

## 9. 代码目录结构

建议 AI 编程软件整理为：

```text
project-root/
  backend/
    app/
      main.py
      config.py
      routers/
        health.py
        upload.py
        ocr.py
        analyze.py
        report.py
        user.py
      services/
        bailian_client.py
        ocr_service.py
        speech_text_parser.py
        score_parser.py
        analyze_service.py
        report_service.py
        storage_service.py
      models/
        score.py
        report.py
        user.py
      db/
        database.py
        schemas.sql
    requirements.txt
    Dockerfile
    .dockerignore
    README.md

  miniprogram/
    app.js
    app.json
    app.wxss
    pages/
      index/
      input/
      upload/
      confirm/
      report/
      history/
      privacy/
    utils/
      request.js
      auth.js
      config.js
```

---

## 10. 后端 API 设计

### 10.1 MVP 必需接口

```text
GET  /api/health
POST /api/ocr-score
POST /api/parse-score-text
POST /api/analyze-score
POST /api/reports
GET  /api/reports/{report_id}
GET  /api/exams/history
```

### 10.2 接口说明

#### GET /api/health

返回：

```json
{
  "status": "ok"
}
```

#### POST /api/ocr-score

输入：

```text
图片 file 或 image_url
```

处理：

```text
1. 调用 qwen-vl-max-latest。
2. 识别成绩单文本。
3. 转换为 ScoreInput 草稿。
4. 返回 raw_text、confidence、structured_score。
```

输出示例：

```json
{
  "raw_text": "...",
  "confidence": 0.82,
  "structured_score": {}
}
```

#### POST /api/parse-score-text

输入：

```json
{
  "text": "这是孩子这次高一期中英语成绩，满分150，考了108分..."
}
```

处理：

```text
1. 从口语描述中抽取分数。
2. 转换为 ScoreInput。
3. 不生成正式报告。
4. 返回确认草稿。
```

#### POST /api/analyze-score

输入：

```json
{
  "student": {},
  "exam": {},
  "subjects": []
}
```

处理：

```text
1. 先执行本地规则分析。
2. 再调用 qwen-max-latest 生成自然语言报告。
3. 报告必须结构化。
```

输出：

```json
{
  "summary": "",
  "subject_performance": [],
  "priority": [],
  "two_week_plan": [],
  "parent_advice": "",
  "elective_advice": "",
  "disclaimer": "本报告仅供学习规划参考，不构成升学、选科或教育决策承诺。"
}
```

---

## 11. 后端 Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
```

### 11.1 requirements.txt

```text
fastapi
uvicorn[standard]
pydantic
python-dotenv
httpx
python-multipart
Pillow
```

### 11.2 本地测试命令

```bash
cd backend
docker build -t ai-score-api .
docker run -p 8080:8080 --env-file .env ai-score-api
curl http://127.0.0.1:8080/api/health
```

---

## 12. 环境变量

后端 `.env` 示例：

```text
DASHSCOPE_API_KEY=你的阿里百炼API_KEY
OCR_MODEL=qwen-vl-max-latest
ANALYZE_MODEL=qwen-max-latest
REPORT_CACHE_ENABLED=true
ENV=production
DATABASE_URL=
```

要求：

```text
1. API Key 只能放在后端环境变量。
2. 小程序前端代码中不得出现任何大模型 API Key。
3. 如果缺少 DASHSCOPE_API_KEY，服务启动时必须明确报错。
```

---

## 13. 微信云托管部署步骤

### 13.1 部署流程

```text
1. 进入微信云托管控制台。
2. 绑定小程序 AppID。
3. 创建环境，例如 prod-ai-score。
4. 创建服务，例如 ai-score-api。
5. 选择代码仓库或上传镜像。
6. 指定 Dockerfile 所在目录：backend/。
7. 设置容器端口：8080。
8. 配置环境变量：
   - DASHSCOPE_API_KEY
   - OCR_MODEL
   - ANALYZE_MODEL
   - DATABASE_URL
9. 部署服务。
10. 测试 /api/health。
11. 小程序端配置后端请求地址。
```

### 13.2 小程序请求封装

`miniprogram/utils/request.js`：

```javascript
const BASE_URL = '你的云托管服务地址';

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  request
};
```

---

## 14. 数据库设计

### 14.1 最小表结构

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  exam_name VARCHAR(128),
  grade VARCHAR(32),
  exam_date DATE,
  total_score DECIMAL(6,2),
  full_score DECIMAL(6,2),
  raw_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  exam_id BIGINT NOT NULL,
  report_json JSON,
  report_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 14.2 MVP 简化策略

第一版可以：

```text
1. 本地开发使用 SQLite。
2. 小程序本地保存最近 3 条报告。
3. 生产环境再切换云数据库。
4. 不长期保存原始成绩单图片。
5. 报告可保存，原图默认删除。
```

---

## 15. 成本与价格分析

### 15.1 主要成本构成

```text
1. 微信云托管容器资源
2. 数据库
3. 云存储
4. AI模型调用
5. 构建与流量
```

### 15.2 微信云托管基础资源估算

假设最低常驻配置：

```text
0.5 核 CPU
1 GB 内存
24小时运行
30天
```

按价格估算：

```text
CPU：0.055 元 / 核·小时
内存：0.032 元 / GB·小时

CPU = 0.5 × 24 × 30 × 0.055 = 19.8 元/月
内存 = 1 × 24 × 30 × 0.032 = 23.04 元/月

基础容器合计 ≈ 42.84 元/月
加少量构建和流量 ≈ 50-100 元/月
```

### 15.3 数据库成本

如果使用独立 MySQL，成本可能明显高于容器。

估算：

```text
数据库算力：0.342 元 / 个·小时

1 × 24 × 30 × 0.342 ≈ 246.24 元/月
```

所以 MVP 不建议一开始开独立 MySQL。

推荐：

```text
阶段1：小程序本地缓存 + SQLite开发
阶段2：云开发数据库 / 轻量数据库
阶段3：用户量稳定后再上 MySQL 或 PostgreSQL
```

### 15.4 云存储成本

成绩截图只用于 OCR，不建议长期保存。

假设：

```text
每天100张图片
每张1MB
保留7天
```

存储量约 700MB，成本较低。

优化策略：

```text
1. 图片压缩。
2. OCR完成后删除原图。
3. 分享图单独生成。
4. 默认不保存原始成绩单。
```

### 15.5 AI调用成本

真实最大成本通常是 AI 调用，而不是服务器。

一次完整报告包含：

```text
1次 OCR / 多模态调用
1次 文本分析调用
```

粗略估算：

```text
每次完整报告：0.05 - 0.30 元
每天100次：5 - 30 元/天
每月：150 - 900 元/月
```

优化策略：

```text
1. 手动录入优先，减少OCR调用。
2. OCR后必须人工确认，避免错误重复分析。
3. 同一份成绩重复生成报告时走缓存。
4. 免费版报告限制长度。
5. 深度报告才生成更长分析。
6. 报告模板固定，减少无效输出。
```

### 15.6 阶段预算

#### 阶段A：开发测试期，0-50个种子用户

```text
云托管：0-100 元/月
数据库：0-30 元/月
AI：50-300 元/月

合计：50-430 元/月
```

#### 阶段B：小范围上线，100-500个真实用户

```text
云托管：50-200 元/月
数据库：30-250 元/月
存储/流量：10-50 元/月
AI：300-1500 元/月

合计：390-2000 元/月
```

#### 阶段C：验证付费后，1000+用户

```text
基础云资源：300-800 元/月
数据库：250-800 元/月
AI：1000-5000+ 元/月

合计：1550-6600+ 元/月
```

### 15.7 商业化试验

早期不要复杂会员体系。

建议：

```text
免费：基础报告
付费：9.9元深度报告
可选：19.9元两周学习计划
```

早期验证指标：

```text
1. 50-100名种子用户完成真实成绩分析。
2. 录入完成率达到70%以上。
3. 报告满意度达到70%以上。
4. 分享率达到10%以上。
5. 9.9元深度报告转化率达到3%-5%。
```

---

## 16. 合规与隐私要求

学生成绩和排名属于敏感信息，且用户多数涉及未成年人。

第一版必须做到：

```text
1. 只收集完成功能所需的数据。
2. 不强制收集真实姓名。
3. 不强制收集学校。
4. 不强制收集手机号。
5. 分享卡片默认隐藏具体姓名和敏感排名。
6. 提供隐私政策页面。
7. 提供数据删除入口或说明。
8. 敏感数据传输必须使用 HTTPS。
9. 服务端不得明文泄露 API Key。
10. 报告必须声明“仅供学习规划参考”。
```

免责声明建议：

```text
本报告基于用户提供的成绩信息生成，仅供学习复盘和阶段规划参考，不构成升学、选科、报考或教育决策承诺。
```

---

## 17. 图标与视觉方向

### 17.1 图标主题

适合该产品的图标方向：

```text
1. 成绩单 + 放大镜
2. 妈妈查看成绩单
3. 书本 + 上升箭头
4. 雷达图 / 趋势图
5. 清单 + 对勾
6. 家长与孩子 + 安心盾牌
```

### 17.2 当前图标风格建议

当前图标为：

```text
蓝紫科技感
成绩上升箭头
脑图 / AI感
语数英试卷
```

因此介绍文字不要再堆 AI 技术词，避免显得过度技术化。

视觉要表达：

```text
成绩提升
清晰分析
家长安心
学习规划
```

---

## 18. AI 编程软件总任务提示词

可以直接复制给 AI 编程软件：

```text
你是资深全栈工程师。请基于当前项目开发一个“AI成绩分析微信小程序”的 MVP。

目标：
保留现有 Web 原型中的 OCR、成绩解析、AI 分析、选科建议逻辑。
将后端改造成 FastAPI API 服务，并用 Docker 部署到微信云托管。
开发微信原生小程序前端，支持手动录入、上传成绩单、OCR确认、口头成绩描述解析、生成报告、查看历史报告。

技术要求：
1. 后端使用 FastAPI。
2. 后端目录为 backend/app。
3. 小程序目录为 miniprogram。
4. AI API Key 只允许存在后端环境变量中，不允许出现在小程序代码。
5. OCR 使用现有 qwen-vl-max-latest 逻辑。
6. 文本分析使用现有 qwen-max-latest 逻辑。
7. AI 输入必须是结构化 JSON，不允许直接把用户原始文本全部丢给最终分析模型。
8. 报告输出必须结构化，包括：
   - 核心诊断
   - 科目表现
   - 优先级排序
   - 两周行动建议
   - 家长沟通建议
   - 高中选科建议
9. 上传图片 OCR 后，必须进入人工确认页面，用户确认后才能生成报告。
10. 口头成绩描述解析后，也必须进入人工确认页面。
11. 默认不强制收集学生姓名、学校、手机号。
12. 分享内容默认隐藏具体姓名和敏感排名。
13. 提供 /api/health 健康检查接口。
14. 提供 Dockerfile，端口使用 8080。
15. 提供 README，说明本地运行、Docker运行、微信云托管部署步骤。
16. 不要实现会员、支付、PDF、机构后台，先完成可运行 MVP。

后端接口：
GET /api/health
POST /api/ocr-score
POST /api/parse-score-text
POST /api/analyze-score
POST /api/reports
GET /api/reports/{report_id}
GET /api/exams/history

前端页面：
pages/index/index
pages/input/input
pages/upload/upload
pages/confirm/confirm
pages/report/report
pages/history/history
pages/privacy/privacy

验收要求：
1. 本地可以启动 FastAPI。
2. Docker 可以构建并运行。
3. /api/health 返回 {"status":"ok"}。
4. 小程序可以手动录入英语成绩并生成报告。
5. 小程序可以上传图片，拿到 OCR 草稿。
6. OCR 草稿可以编辑确认。
7. 口头成绩描述可以解析为结构化分数。
8. 确认后可以生成报告。
9. 报告里有明确的强弱项、优先级和行动建议。
10. API Key 没有出现在小程序代码中。
11. 报告页面没有夸大承诺，例如“保证提分”“预测升学结果”。
12. 可以部署到微信云托管。
13. 关闭原图长期保存，或至少提供删除逻辑。
```

---

## 19. 开发优先级

### 19.1 第一优先级

```text
1. 成绩数据结构统一
2. 手动录入
3. OCR识别
4. 人工确认
5. 基础报告生成
6. Docker部署
7. 微信云托管上线
```

### 19.2 第二优先级

```text
1. 历史报告
2. 分享卡片
3. 口头描述解析
4. 报告缓存
5. 隐私删除入口
```

### 19.3 第三优先级

```text
1. 9.9元深度报告
2. 微信支付
3. 更完整趋势分析
4. 高中选科规则库
5. 家长周报
```

---

## 20. 验收标准

最终 MVP 应满足：

```text
1. 家长可以不懂技术也能完成操作。
2. 录入成绩不超过2分钟。
3. 上传成绩单后必须能手动修改。
4. 报告生成时间控制在30秒以内。
5. 报告语言像“有经验的班主任”，不是像“AI模型”。
6. 报告必须具体，不只说“继续努力”。
7. 免费报告简洁，深度报告可扩展。
8. 分享内容默认脱敏。
9. 所有 AI Key 都在后端。
10. 后端可以用 Docker 部署到微信云托管。
```

---

## 21. 一句话总结

当前最优路线：

> 保留现有 FastAPI 和阿里百炼能力，开发微信原生小程序前端，后端 Docker 化后部署到微信云托管，用结构化成绩数据驱动 AI 报告生成，先验证“家长是否觉得报告具体、有用、愿意复访”，再扩展支付、历史趋势和选科规则库。
