import { config } from '../config.js'

export async function runAnalysis({ type, payload }) {
  if (!config.aliyun.apiKey) {
    throw new Error('服务端未配置 ALIYUN_API_KEY')
  }

  const prompt = buildSafePrompt(type, payload)
  const response = await fetch(config.aliyun.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.aliyun.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.aliyun.analysisModel,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'AI 分析调用失败')
  }

  return {
    model: config.aliyun.analysisModel,
    report: sanitizeAiReport(data.choices?.[0]?.message?.content || '')
  }
}

export async function runOcr({ fileBuffer, mimeType, type }) {
  if (!config.aliyun.apiKey) {
    throw new Error('服务端未配置 ALIYUN_API_KEY')
  }

  const base64 = fileBuffer.toString('base64')
  const imageUrl = `data:${mimeType || 'image/png'};base64,${base64}`
  const response = await fetch(config.aliyun.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.aliyun.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.aliyun.ocrModel,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: buildOcrPrompt(type) }
        ]
      }]
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'OCR 调用失败')
  }

  return {
    model: config.aliyun.ocrModel,
    raw: data.choices?.[0]?.message?.content || ''
  }
}

function buildSafePrompt(type, payload) {
  return [
    `分析类型：${type}`,
    '必须只基于用户提供的成绩、排名、历史趋势、试卷截图或手动输入材料分析。',
    '不知道或没有依据的信息必须明确说明无法判断，不能编造。',
    '如果只看到“解答题”“大题”“第X题”等笼统描述，不得推断三角函数、数列、立体几何等具体考点。',
    '不要使用 Markdown 星号，段落编号使用 1、2、3、。',
    '',
    JSON.stringify(payload, null, 2)
  ].join('\n')
}

function buildOcrPrompt(type) {
  return [
    `图片类型：${type === 'max' ? '班级或年级最高分截图' : '学生个人成绩截图'}`,
    '请识别图片中的科目、真实分数、总分、班级排名、年级排名。',
    '同一行可能同时出现分数、班级排名、年级排名，绝不能把排名识别为科目分数。',
    '如果无法确定某个数字是分数还是排名，写入 warnings，不要强行填入分数字段。',
    '只返回 JSON，不要输出解释文字。',
    'JSON 字段：scores[{subject,score,fullScore}], totalScore, classRank, gradeRank, warnings[]。'
  ].join('\n')
}

function sanitizeAiReport(report) {
  let index = 1
  return String(report || '')
    .split('\n')
    .map(line => {
      const clean = line.replace(/^\s{0,3}#{1,6}\s*/, '')
      const bullet = clean.match(/^\s*[-*•]\s+(.+)$/)
      if (bullet) return `${index++}、${bullet[1].replace(/\*/g, '').trim()}`
      return clean.replace(/\*/g, '')
    })
    .join('\n')
    .trim()
}
