/*
 * AIScoreAnalysis - AI成绩分析小程序
 * 版本信息与修改记录
 */

export const VERSION = '1.6.3';
export const BUILD_DATE = '2026-05-11';
export const BUILD_NUMBER = '20260511-04';

export const CHANGELOG = [
  {
    version: '1.6.3',
    date: '2026-05-11',
    author: 'Claude',
    changes: [
      '修复runDeepAnalysis中nextAnalysis未定义的错误',
      '新增各省市高考/中考满分数据表（getFullScoreData）',
      'AI分析提示词新增满分参考数据',
      '简要分析表格根据城市+年级显示正确满分（不再硬编码100）'
    ]
  },
  {
    version: '1.6.2',
    date: '2026-05-11',
    author: 'Claude',
    changes: [
      '核心诊断格式改为数字编号（1、2、3）替代**符号',
      '各科成绩对比表现在显示全部科目，不只是强弱科目',
      '优化AI深度分析提示词，参考专业分析文档格式',
      'PremiumAnalysisCard在有AI报告时独立显示，不与本地分析混合'
    ]
  },
  {
    version: '1.6.1',
    date: '2026-05-11',
    author: 'Claude',
    changes: [
      '修改buildDeepAnalysisPrompt，不传递本地计算结果，强制AI基于原始数据独立分析',
      '更新README.md架构文档，反映阿里百炼OCR和分析双模型配置',
      '确认页面将个人成绩与最高分合并为CombinedScoreEditor组件',
      '优势科目标签现在也显示与最高分的分差（与弱势科目一致）'
    ]
  },
  {
    version: '1.6.0',
    date: '2026-05-11',
    author: 'Claude',
    changes: [
      '更新README.md架构文档，反映阿里百炼OCR和分析双模型配置',
      '确认页面将个人成绩与最高分合并为CombinedScoreEditor组件',
      '优势科目标签现在也显示与最高分的分差（与弱势科目一致）'
    ]
  },
  {
    version: '1.5.0',
    date: '2026-05-11',
    author: 'Codex',
    changes: [
      '手动输入模式改为在首页当前页面直接录入成绩并生成分析',
      '新增独立数据分析模型 qwen-max-latest，用于生成深度分析和建议',
      '结果页新增调试依据，展示图片识别模型、数据分析模型、计算公式和规则依据',
      'AI 深度分析接入千问文本模型，调试阶段完整展示付费增强分析内容'
    ]
  },
  {
    version: '1.4.2',
    date: '2026-05-08',
    author: 'Codex',
    changes: [
      '修复构建产物直接打开时资源路径错误导致网页加载失败的问题'
    ]
  },
  {
    version: '1.4.1',
    date: '2026-05-08',
    author: 'Codex',
    changes: [
      '移动端恢复单列主流程，避免手机客户看到左右分栏菜单',
      '桌面端保留大屏双栏布局，手机端只在必要的小统计卡片内使用两列'
    ]
  },
  {
    version: '1.4.0',
    date: '2026-05-08',
    author: 'Codex',
    changes: [
      '首页整理为紧凑工作台布局，提供导入截图和手动输入两种路径',
      '导入路径只要求学生成绩截图，最高分截图改为可选',
      '手动输入路径直接进入空白成绩确认页',
      '确认页和分析页改为桌面两栏布局，减少整页上下滚动',
      '高中阶段新增基于成绩结构的选科建议'
    ]
  },
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
