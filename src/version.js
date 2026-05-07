/*
 * AIScoreAnalysis - AI成绩分析小程序
 * 版本信息与修改记录
 */

export const VERSION = '1.3.0';
export const BUILD_DATE = '2026-05-08';
export const BUILD_NUMBER = '20260508-01';

export const CHANGELOG = [
  {
    version: '1.3.0',
    date: '2026-05-08',
    author: 'Codex',
    changes: [
      '阿里百炼图片识别模型切换为 qwen-vl-max-latest，提高学生成绩图的数值识别准确率',
      '强化个人成绩图提示词，重点区分分数、班级排名和年级排名',
      '分析结果引入城市和年级差异化判断，输出更贴近本地竞争环境的建议',
      '删除首页上传区域的长段说明文案'
    ]
  },
  {
    version: '1.2.1',
    date: '2026-05-07',
    author: 'Codex',
    changes: [
      '新增上传说明，明确学生成绩图与最高分图应包含的数据含义',
      '个人成绩确认区改为只编辑科目和真实分数，避免把班级排名或年级排名混入科目分数'
    ]
  },
  {
    version: '1.2.0',
    date: '2026-05-07',
    author: 'Codex',
    changes: [
      '上传流程改为双图片区分：学生成绩图与班级/年级最高分图',
      'OCR 模型切换为阿里百炼 qwen-vl-ocr-latest',
      '新增 OCR 识别后的人工确认步骤，可修改各科分数、总分、班级排名和年级排名',
      '增强 OCR 结果校验，尽量过滤被误识别为分数的排名数字',
      '首页移除顶部标题文案，保留原有整体视觉语言',
      '调试阶段完整显示 AI 深度分析内容'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-05-07',
    author: 'Claude',
    changes: [
      '初始版本发布',
      '实现三步骤流程：上传成绩 → 基本信息 → 分析结果',
      '集成 DeepSeek AI 进行 OCR 图像识别（支持base64格式）',
      '支持多图上传、拖拽上传、粘贴截图',
      '城市和年级选择器',
      '免费简单分析功能（平均分、排名估算、优势/弱势科目）',
      '付费深度分析界面（占位）',
      '响应式移动端优先设计',
      'Tailwind CSS 样式优化',
      'AI服务商切换功能（DeepSeek推荐，MiniMax暂不可用）'
    ]
  }
];

export default { VERSION, BUILD_DATE, BUILD_NUMBER, CHANGELOG };
