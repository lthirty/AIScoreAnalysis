import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  Camera,
  FileText,
  Check,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Trash2,
  Plus,
  Brain,
  TrendingUp,
  Award,
  Target,
  Zap,
  Crown,
  RefreshCw
} from 'lucide-react'
import { VERSION, BUILD_DATE } from './version.js'

const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '武汉', '成都',
  '重庆', '西安', '苏州', '天津', '青岛', '长沙', '郑州', '大连',
  '沈阳', '济南', '福州', '厦门', '合肥', '昆明', '哈尔滨', '长春',
  '贵阳', '太原', '石家庄', '兰州', '乌鲁木齐', '呼和浩特'
]

const GRADES = {
  小学: ['五年级', '六年级'],
  初中: ['初一', '初二', '初三'],
  高中: ['高一', '高二', '高三']
}

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']

const SUBJECT_ALIASES = {
  语文: '语文',
  语: '语文',
  数学: '数学',
  数: '数学',
  英语: '英语',
  英: '英语',
  外语: '英语',
  物理: '物理',
  物: '物理',
  化学: '化学',
  化: '化学',
  生物: '生物',
  生: '生物',
  历史: '历史',
  历: '历史',
  地理: '地理',
  地: '地理',
  政治: '政治',
  政: '政治',
  道法: '政治',
  道德与法治: '政治'
}

const AI_PROVIDERS = {
  aliyun: {
    name: '阿里百炼',
    apiKey: 'sk-7e50288cd0d549e98ff4d8ed4bf2a399',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-vl-max-latest',
    supportsVision: true,
    recommended: true
  },
  minimax: {
    name: 'MiniMax',
    apiKey: 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M',
    endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    model: 'MiniMax-Text-01',
    supportsVision: false,
    recommended: false
  },
  deepseek: {
    name: 'DeepSeek',
    apiKey: 'sk-c32afa55e11d439684cac17659276a34',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    supportsVision: false,
    recommended: false
  }
}

function defaultImageSlot() {
  return { file: null, preview: '' }
}

function defaultMeta() {
  return {
    totalScore: '',
    classRank: '',
    gradeRank: '',
    maxTotalScore: ''
  }
}

function getCityProfile(city) {
  const highCompetitionCities = ['北京', '上海', '深圳', '杭州', '南京', '苏州', '广州']
  const strongCompetitionCities = ['武汉', '成都', '重庆', '西安', '天津', '青岛', '长沙', '郑州', '厦门', '福州']

  if (highCompetitionCities.includes(city)) {
    return {
      level: '高竞争',
      feature: `${city} 更强调稳定总分、竞争节奏和阶段性排名变化`,
      advice: '分析时要更关注排名位置、短板学科和总分波动。'
    }
  }

  if (strongCompetitionCities.includes(city)) {
    return {
      level: '中高竞争',
      feature: `${city} 对基础扎实度和中高难度题的稳定发挥要求较高`,
      advice: '分析时要兼顾基础分回收和拔高题训练。'
    }
  }

  return {
    level: '稳步竞争',
    feature: `${city} 更适合先稳住基础，再逐步拉开学科差距`,
    advice: '分析时优先看基础分流失点和可持续提分空间。'
  }
}

function getGradeProfile(grade) {
  const profiles = {
    五年级: { stage: '基础衔接期', advice: '重点看基础习惯、计算准确率和阅读理解能力。' },
    六年级: { stage: '升学准备期', advice: '重点看知识覆盖度和升学前的综合稳定性。' },
    初一: { stage: '初中过渡期', advice: '重点看学科数量增加后的适应情况和学习节奏。' },
    初二: { stage: '能力拉开期', advice: '重点看弱科是否开始拖累总分。' },
    初三: { stage: '冲刺定型期', advice: '重点看总分、排名和各科提分效率。' },
    高一: { stage: '高中适应期', advice: '重点看理科抽象度提升后的适应情况和知识断层。' },
    高二: { stage: '系统强化期', advice: '重点看优势科能否继续拉开差距，弱科能否止损。' },
    高三: { stage: '高考冲刺期', advice: '重点看总分稳定性、考试节奏和提分回报率。' }
  }

  return profiles[grade] || { stage: '当前阶段', advice: '重点看总分结构、排名位置和短板科目。' }
}

function StepIndicator({ currentStep }) {
  const steps = ['上传图片', '确认成绩', '分析结果']

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                ${index < currentStep ? 'bg-success text-white' :
                  index === currentStep ? 'bg-primary text-white' :
                  'bg-gray-200 text-gray-500'}`}
            >
              {index < currentStep ? <Check size={18} /> : index + 1}
            </div>
            <span className={`text-xs mt-2 ${index === currentStep ? 'text-primary font-semibold' : 'text-gray-500'}`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-16 h-1 mx-2 rounded ${index < currentStep ? 'bg-success' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function AIProviderSelector({ value, onChange, customKeys, onCustomKeyChange }) {
  const getPlaceholder = (providerKey) => {
    if (providerKey === 'aliyun') {
      return '阿里百炼APIKey(可选填，当前已使用内置Key)'
    }

    return `${AI_PROVIDERS[providerKey]?.name} API Key（选填，使用内置Key）`
  }

  return (
    <div className="card bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="text-primary" size={20} />
        <span className="font-medium text-gray-700">AI 服务商</span>
      </div>
      <div className="flex gap-2">
        {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all relative
              ${value === key
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {provider.name}
            {provider.recommended && (
              <span className="absolute -top-2 -right-2 bg-success text-white text-xs px-1.5 py-0.5 rounded-full">
                推荐
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <input
          type="password"
          placeholder={getPlaceholder(value)}
          value={customKeys[value] || ''}
          onChange={(e) => onCustomKeyChange(value, e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        />
        <p className="text-xs text-gray-400">
          使用自己的 API Key 可享受更高额度 · 当前已使用内置Key
        </p>
      </div>
    </div>
  )
}

function ImageUploadSlot({ title, description, slot, onSelect, onRemove, disabled }) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const file = Array.from(e.dataTransfer.files).find(item => item.type.startsWith('image/'))
    if (file) {
      onSelect(file)
    }
  }, [disabled, onSelect])

  const handleFileChange = (e) => {
    const file = Array.from(e.target.files).find(item => item.type.startsWith('image/'))
    if (file) {
      onSelect(file)
    }
    fileInputRef.current.value = ''
  }

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {slot.preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200">
          <img src={slot.preview} alt={title} className="w-full h-48 object-cover bg-gray-50" />
          <button
            onClick={onRemove}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/55 text-white flex items-center justify-center"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            ${isDragging ? 'border-primary bg-indigo-50/50 animate-pulse' : 'border-gray-300 hover:border-primary hover:bg-indigo-50/30'}`}
        >
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center">
            <Upload className="text-primary" size={24} />
          </div>
          <p className="text-base font-medium text-gray-700 mb-2">点击或拖拽上传</p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Camera size={14} /> 拍照</span>
            <span className="flex items-center gap-1"><FileText size={14} /> 截图</span>
          </div>
        </div>
      )}
    </div>
  )
}

function CitySelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCities = CITIES.filter(city => city.includes(search) || search === '')

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">所在城市</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-primary transition-colors"
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || '请选择城市'}
        </span>
        <ChevronRight className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} size={20} />
      </button>
      {isOpen && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="搜索城市..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredCities.map(city => (
              <button
                key={city}
                onClick={() => {
                  onChange(city)
                  setIsOpen(false)
                  setSearch('')
                }}
                className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GradeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">年级</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-primary transition-colors"
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || '请选择年级'}
        </span>
        <ChevronRight className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} size={20} />
      </button>
      {isOpen && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {Object.entries(GRADES).map(([level, grades]) => (
            <div key={level}>
              <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">{level}</div>
              {grades.map(grade => (
                <button
                  key={grade}
                  onClick={() => {
                    onChange(grade)
                    setIsOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700"
                >
                  {grade}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScoreEditor({ title, scores, onScoresChange, summary, showFullScore = false }) {
  const handleScoreChange = (index, field, value) => {
    const next = [...scores]
    next[index][field] = value
    onScoresChange(next)
  }

  const handleDelete = (index) => {
    onScoresChange(scores.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleAdd = () => {
    onScoresChange([...scores, { subject: '', score: '', fullScore: '' }])
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{scores.length} 科目</span>
        </div>
        <button
          onClick={handleAdd}
          className="text-sm text-primary hover:text-indigo-600 flex items-center gap-1"
        >
          <Plus size={16} /> 添加
        </button>
      </div>

      {summary && (
        <p className="text-xs text-gray-500 mb-3">{summary}</p>
      )}

      <div className={`grid ${showFullScore ? 'grid-cols-[72px_1fr_1fr_36px]' : 'grid-cols-[72px_1fr_36px]'} gap-2 text-xs text-gray-400 px-2 mb-2`}>
        <span>科目</span>
        <span className="text-center">{showFullScore ? '分数/最高分' : '分数'}</span>
        {showFullScore && <span className="text-center">满分</span>}
        <span />
      </div>

      <div className="space-y-2">
        {scores.map((item, index) => (
          <div key={`${title}-${index}`} className={`grid ${showFullScore ? 'grid-cols-[72px_1fr_1fr_36px]' : 'grid-cols-[72px_1fr_36px]'} gap-2 items-center bg-white rounded-lg p-2`}>
            <input
              type="text"
              value={item.subject}
              onChange={(e) => handleScoreChange(index, 'subject', e.target.value)}
              placeholder="科目"
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              value={item.score}
              onChange={(e) => handleScoreChange(index, 'score', e.target.value)}
              placeholder="分数"
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
            />
            {showFullScore && (
              <input
                type="number"
                value={item.fullScore ?? ''}
                onChange={(e) => handleScoreChange(index, 'fullScore', e.target.value)}
                placeholder="满分"
                className="px-2 py-1 text-sm border border-gray-200 rounded-lg text-center"
              />
            )}
            <button
              onClick={() => handleDelete(index)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryEditor({ meta, onChange }) {
  const items = [
    { key: 'totalScore', label: '个人总分', placeholder: '自动或手动填写' },
    { key: 'classRank', label: '班级排名', placeholder: '如识别到可修改' },
    { key: 'gradeRank', label: '年级排名', placeholder: '如识别到可修改' },
    { key: 'maxTotalScore', label: '最高总分', placeholder: '如识别到可修改' }
  ]

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-700">识别汇总</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.key}>
            <label className="block text-xs text-gray-500 mb-1">{item.label}</label>
            <input
              type="number"
              value={meta[item.key]}
              onChange={(e) => onChange(item.key, e.target.value)}
              placeholder={item.placeholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function AIAnalysisBanner() {
  return (
    <div className="bg-gradient-to-r from-primary via-secondary to-accent p-1 rounded-2xl">
      <div className="bg-white rounded-xl px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="text-primary" size={24} />
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI 智能分析
          </span>
          <Brain className="text-secondary" size={24} />
        </div>
        <p className="text-xs text-gray-500">先识别，再人工确认，最后输出完整分析</p>
      </div>
    </div>
  )
}

function FreeAnalysisCard({ analysis }) {
  if (!analysis) return null

  return (
    <div className="card bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="text-primary" size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">AI 简要分析</h3>
          <p className="text-xs text-gray-500">识别确认后自动生成</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-primary">{analysis.average.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">平均分</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-accent">{analysis.ranking}</p>
            <p className="text-xs text-gray-500 mt-1">综合判断</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-sm text-gray-500">个人总分</p>
            <p className="text-2xl font-bold text-secondary">{analysis.totalScore}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-sm text-gray-500">最高总分</p>
            <p className="text-2xl font-bold text-warning">{analysis.maxTotalScore || '-'}</p>
          </div>
        </div>

        {(analysis.classRank || analysis.gradeRank) && (
          <div className="bg-white rounded-xl p-3 shadow-sm grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-sm text-gray-500">班级排名</p>
              <p className="text-xl font-bold text-primary">{analysis.classRank || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">年级排名</p>
              <p className="text-xl font-bold text-secondary">{analysis.gradeRank || '-'}</p>
            </div>
          </div>
        )}

        {analysis.maxScores && Object.keys(analysis.maxScores).length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <TrendingUp size={16} className="text-accent" /> 各科最高分参考
            </p>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(analysis.maxScores).map(([subject, score]) => (
                  <div key={subject} className="text-center">
                    <p className="text-gray-500">{subject}</p>
                    <p className="font-semibold text-accent">{score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Award size={16} className="text-success" /> 优势科目
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.strengths.length > 0
              ? analysis.strengths.map(item => (
                <span key={item.subject} className="px-3 py-1 bg-success/10 text-success text-sm rounded-full">
                  {item.subject} ({item.score}分)
                </span>
              ))
              : <span className="text-sm text-gray-400">暂无突出优势</span>}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Target size={16} className="text-warning" /> 待提升科目
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.weaknesses.length > 0
              ? analysis.weaknesses.map(item => (
                <span key={item.subject} className="px-3 py-1 bg-warning/10 text-warning text-sm rounded-full">
                  {item.subject} (-{item.diff}分)
                </span>
              ))
              : <span className="text-sm text-gray-400">各科目发展均衡</span>}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Zap size={16} className="text-primary" /> 学习建议
          </p>
          <ul className="space-y-2">
            {analysis.suggestions.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function PremiumAnalysisCard({ analysis }) {
  if (!analysis?.deepAnalysis) return null

  const { deepAnalysis } = analysis

  return (
    <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
          <Crown className="text-warning" size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">AI 深度分析</h3>
          <p className="text-xs text-gray-500">调试阶段完整显示</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">整体判断</p>
          <p className="text-sm text-gray-600 leading-6">{deepAnalysis.overview}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">分差诊断</p>
          <ul className="space-y-2">
            {deepAnalysis.gapInsights.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-warning mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">学习执行方案</p>
          <ul className="space-y-2">
            {deepAnalysis.actionPlan.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">考试策略</p>
          <ul className="space-y-2">
            {deepAnalysis.examTips.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-secondary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-4 shadow-lg shadow-amber-200">
          <p className="text-sm font-medium mb-2">阶段目标</p>
          <p className="text-sm leading-6">{deepAnalysis.nextGoal}</p>
        </div>
      </div>
    </div>
  )
}

function normalizeSubject(subject) {
  if (typeof subject !== 'string') return ''

  const clean = subject.replace(/\s+/g, '').trim()
  return SUBJECT_ALIASES[clean] || ''
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null

  const numeric = Number(value)
  return Number.isNaN(numeric) ? null : numeric
}

function calculateTotalScore(scores) {
  return scores.reduce((sum, item) => sum + (toNumber(item.score) || 0), 0)
}

function getCustomApiKey(providerKey, customKeys) {
  return customKeys[providerKey]?.trim() || AI_PROVIDERS[providerKey].apiKey
}

function buildOcrPrompt(type) {
  if (type === 'my') {
    return [
      '这是学生个人成绩截图。',
      '请只提取每个科目的真实分数、总分、班级排名、年级排名。',
      '同一行可能同时出现分数、班级排名、年级排名。score 只能填写该科分数，绝不能填写班级排名或年级排名。',
      '如果看到 7、25、428 这种数字，除非它明确位于成绩列，否则不能写进 score。',
      '如果某一科无法明确判断真实分数，就不要输出该科。',
      '科目仅允许：语文、数学、英语、物理、化学、生物、历史、地理、政治。',
      '不要提取个人成绩图中的每科满分。',
      '请只返回 JSON 对象，格式为：{"scores":[{"subject":"数学","score":104}],"totalScore":624.5,"classRank":7,"gradeRank":428}'
    ].join('')
  }

  return [
    '这是班级或年级最高分截图。',
    '请只提取每个科目的最高分和最高总分。',
    '重点规则：如果同一行有多个数字，只能提取最高分或成绩列对应的数值，绝不能把排名数字写进 score。',
    '如果某一科无法明确判断最高分，就不要输出该科。',
    '科目仅允许：语文、数学、英语、物理、化学、生物、历史、地理、政治。',
    '请只返回 JSON 对象，格式为：{"scores":[{"subject":"语文","score":110,"fullScore":120}],"totalScore":0}'
  ].join('')
}

function extractJsonPayload(content) {
  if (!content || typeof content !== 'string') {
    return null
  }

  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fencedMatch ? fencedMatch[1] : content
  const objectMatch = raw.match(/\{[\s\S]*\}/)

  if (!objectMatch?.[0]) {
    return null
  }

  try {
    return JSON.parse(objectMatch[0])
  } catch (error) {
    console.error('Failed to parse OCR JSON:', error)
    return null
  }
}

function normalizeOcrPayload(payload, type) {
  const warnings = []
  const rawScores = Array.isArray(payload?.scores) ? payload.scores : []

  const scores = rawScores
    .map(item => {
      const subject = normalizeSubject(item?.subject)
      const score = toNumber(item?.score)
      const fullScore = toNumber(item?.fullScore)

      if (!subject || !SUBJECTS.includes(subject) || score === null || score <= 0) {
        return null
      }

      const upperBound = fullScore && fullScore > 0 ? Math.max(fullScore, 100) + 5 : 160
      if (score > upperBound) {
        warnings.push(`${subject} 识别值 ${score} 超出正常分数范围，已忽略`)
        return null
      }

      if (score <= 20 && (!fullScore || fullScore >= 80)) {
        warnings.push(`${subject} 识别值 ${score} 过低，疑似把排名识别成分数，已忽略`)
        return null
      }

      return {
        subject,
        score,
        fullScore: fullScore || ''
      }
    })
    .filter(Boolean)
    .reduce((acc, current) => {
      if (!acc.find(item => item.subject === current.subject)) {
        acc.push(current)
      }
      return acc
    }, [])

  return {
    scores,
    totalScore: toNumber(payload?.totalScore),
    classRank: type === 'my' ? toNumber(payload?.classRank) : null,
    gradeRank: type === 'my' ? toNumber(payload?.gradeRank) : null,
    warnings
  }
}

function buildAnalysis(myScores, maxScores, meta, city, grade) {
  const validScores = myScores
    .map(item => ({
      subject: normalizeSubject(item.subject),
      score: toNumber(item.score) || 0
    }))
    .filter(item => item.subject && item.score > 0)

  if (validScores.length === 0) {
    return null
  }

  const totalScore = toNumber(meta.totalScore) || calculateTotalScore(validScores)
  const maxTotalScore = toNumber(meta.maxTotalScore) || 0
  const average = totalScore / validScores.length
  const classRank = toNumber(meta.classRank)
  const gradeRank = toNumber(meta.gradeRank)
  const cityProfile = getCityProfile(city)
  const gradeProfile = getGradeProfile(grade)

  let ranking = '前50%'
  if (gradeRank && gradeRank <= 30) ranking = '年级前列'
  else if (classRank && classRank <= 10) ranking = '班级前列'
  else if (average >= 95) ranking = '前1%'
  else if (average >= 90) ranking = '前5%'
  else if (average >= 85) ranking = '前10%'
  else if (average >= 80) ranking = '前15%'
  else if (average >= 75) ranking = '前20%'
  else if (average >= 70) ranking = '前30%'
  else if (average >= 60) ranking = '前40%'

  const strengthCandidates = []
  const weaknessCandidates = []

  validScores.forEach(item => {
    const maxItem = maxScores.find(score => normalizeSubject(score.subject) === item.subject)
    const maxScore = maxItem ? toNumber(maxItem.score) : null

    if (maxScore) {
      const diff = maxScore - item.score
      if (diff <= 10) {
        strengthCandidates.push({ subject: item.subject, score: item.score, diff, maxScore })
      } else if (diff >= 15) {
        weaknessCandidates.push({ subject: item.subject, score: item.score, diff, maxScore })
      }
    } else if (item.score >= average + 8) {
      strengthCandidates.push({ subject: item.subject, score: item.score, diff: 0, maxScore: null })
    } else if (item.score <= average - 8) {
      weaknessCandidates.push({ subject: item.subject, score: item.score, diff: Math.round(average - item.score), maxScore: null })
    }
  })

  strengthCandidates.sort((a, b) => a.diff - b.diff || b.score - a.score)
  weaknessCandidates.sort((a, b) => b.diff - a.diff || a.score - b.score)

  const strengths = strengthCandidates.slice(0, 3)
  const weaknesses = weaknessCandidates.slice(0, 3)

  const suggestions = []
  if (weaknesses[0]) {
    suggestions.push(`${weaknesses[0].subject}是当前最优先的补强科目，先把基础题和典型题做稳。`)
  }
  if (strengths[0]) {
    suggestions.push(`${strengths[0].subject}保持优势，复习时先稳住高分科，再补短板。`)
  }
  if (classRank || gradeRank) {
    suggestions.push(`把班级排名和年级排名当作阶段指标，每次考试后复盘波动原因。`)
  }
  suggestions.push(`${city} 属于${cityProfile.level}环境，${cityProfile.advice}`)
  suggestions.push(`${grade}处于${gradeProfile.stage}，${gradeProfile.advice}`)
  suggestions.push('整理错题时按“知识点-错误原因-改正方法”三列记录，复盘效率更高。')
  suggestions.push('考前一周优先回收基础分，避免只刷难题导致总分不稳。')

  const gapInsights = weaknesses.length > 0
    ? weaknesses.map(item => {
      if (item.maxScore) {
        return `${item.subject}与最高分相差 ${item.diff} 分，说明该科还有明显提分空间，优先处理失分集中的题型。`
      }
      return `${item.subject}低于个人平均分，建议先回看最近两次试卷，找到重复失分点。`
    })
    : ['当前各科分布较均衡，下一阶段重点放在提升总分稳定性和减少非必要失误。']

  const actionPlan = [
    weaknesses[0]
      ? `未来 7 天先集中补 ${weaknesses[0].subject}，每天安排 30 到 40 分钟专项训练。`
      : '未来 7 天以稳固现有优势为主，每天安排固定时间复习错题和基础题。',
    strengths[0]
      ? `优势科 ${strengths[0].subject} 保持手感，隔天做一组综合题，避免强项回落。`
      : '每周至少做一次限时综合练习，确保整体做题速度和准确率不下滑。',
    '把本次考试按题型拆开，统计“会做但做错”和“不会做”的占比，优先解决前者。',
    `${grade}阶段建议：${gradeProfile.advice}`
  ]

  const examTips = [
    '先完成最有把握的题目，确保基础分全部拿到，再回头处理难题。',
    '遇到连续失误时先停 30 秒，快速重置节奏，避免后续题目继续被影响。',
    '考后不是只看总分，更要看哪些知识点重复丢分，这决定下次是否真能提分。'
  ]

  const nextGoal = weaknesses[0]
    ? `下一次考试先争取把 ${weaknesses[0].subject} 提升 8 到 12 分，同时把总分至少提高 ${Math.max(10, weaknesses[0].diff)} 分。`
    : '下一次考试把目标放在稳定发挥，争取总分再提升 5 到 10 分，并减少非知识性失误。'

  return {
    average,
    totalScore,
    maxTotalScore,
    ranking,
    classRank,
    gradeRank,
    strengths,
    weaknesses,
    suggestions,
    maxScores: maxScores.reduce((acc, item) => {
      const subject = normalizeSubject(item.subject)
      const score = toNumber(item.score)
      if (subject && score) {
        acc[subject] = score
      }
      return acc
    }, {}),
    deepAnalysis: {
      overview: `当前共识别 ${validScores.length} 科，平均分 ${average.toFixed(1)} 分，总分 ${totalScore} 分。${classRank ? `班级排名第 ${classRank} 名。` : ''}${gradeRank ? `年级排名第 ${gradeRank} 名。` : ''}${cityProfile.feature}。${grade}处于${gradeProfile.stage}，${weaknesses.length > 0 ? '成绩结构存在明显短板，适合先做补弱提总分。' : '成绩结构比较均衡，适合通过稳定发挥继续提分。'}`,
      gapInsights,
      actionPlan,
      examTips,
      nextGoal
    }
  }
}

export default function App() {
  const [step, setStep] = useState(0)
  const [myImage, setMyImage] = useState(defaultImageSlot)
  const [maxImage, setMaxImage] = useState(defaultImageSlot)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scores, setScores] = useState([])
  const [maxScores, setMaxScores] = useState([])
  const [meta, setMeta] = useState(defaultMeta)
  const [city, setCity] = useState('杭州')
  const [grade, setGrade] = useState('高一')
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [aiProvider, setAiProvider] = useState('aliyun')
  const [customKeys, setCustomKeys] = useState({
    aliyun: '',
    minimax: '',
    deepseek: ''
  })
  const [analysis, setAnalysis] = useState(null)

  const handleImageSelect = (type, file) => {
    const preview = URL.createObjectURL(file)

    if (type === 'my') {
      if (myImage.preview) URL.revokeObjectURL(myImage.preview)
      setMyImage({ file, preview })
    } else {
      if (maxImage.preview) URL.revokeObjectURL(maxImage.preview)
      setMaxImage({ file, preview })
    }

    setError(null)
  }

  const handleImageRemove = (type) => {
    if (type === 'my') {
      if (myImage.preview) URL.revokeObjectURL(myImage.preview)
      setMyImage(defaultImageSlot())
    } else {
      if (maxImage.preview) URL.revokeObjectURL(maxImage.preview)
      setMaxImage(defaultImageSlot())
    }
  }

  const handleMetaChange = (key, value) => {
    setMeta(prev => ({ ...prev, [key]: value }))
  }

  const handleCustomKeyChange = (providerKey, value) => {
    setCustomKeys(prev => ({ ...prev, [providerKey]: value }))
  }

  const runOcr = async (file, type, providerKey) => {
    const provider = AI_PROVIDERS[providerKey]
    const base64Image = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (event) => resolve(event.target.result.split(',')[1])
      reader.readAsDataURL(file)
    })

    const imageUrl = `data:${file.type || 'image/png'};base64,${base64Image}`
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getCustomApiKey(providerKey, customKeys)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            },
            {
              type: 'text',
              text: buildOcrPrompt(type)
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`API调用失败: ${errorData.error?.message || response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('OCR 服务返回了空结果')
    }

    const payload = extractJsonPayload(content)
    if (!payload) {
      throw new Error('OCR 返回内容不是可解析的 JSON')
    }

    return normalizeOcrPayload(payload, type)
  }

  const handleRecognize = async () => {
    if (!city || !grade) {
      alert('请选择城市和年级')
      return
    }
    if (!myImage.file || !maxImage.file) {
      alert('请分别上传个人成绩图和最高分图')
      return
    }

    const provider = AI_PROVIDERS[aiProvider]
    if (!provider?.supportsVision) {
      setError('当前服务商不支持图片识别，请切换到阿里百炼')
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)
    setWarnings([])

    try {
      setProgress(15)
      const myResult = await runOcr(myImage.file, 'my', aiProvider)
      setProgress(60)
      const maxResult = await runOcr(maxImage.file, 'max', aiProvider)
      setProgress(85)

      if (myResult.scores.length === 0) {
        throw new Error('个人成绩图未识别到有效分数，请更换更清晰的截图')
      }
      if (maxResult.scores.length === 0) {
        throw new Error('最高分图未识别到有效分数，请更换更清晰的截图')
      }

      const calculatedTotal = calculateTotalScore(myResult.scores)
      const calculatedMaxTotal = calculateTotalScore(maxResult.scores)

      setScores(myResult.scores.map(item => ({
        subject: item.subject,
        score: item.score,
        fullScore: item.fullScore
      })))
      setMaxScores(maxResult.scores.map(item => ({
        subject: item.subject,
        score: item.score,
        fullScore: item.fullScore
      })))
      setMeta({
        totalScore: myResult.totalScore ?? calculatedTotal,
        classRank: myResult.classRank ?? '',
        gradeRank: myResult.gradeRank ?? '',
        maxTotalScore: maxResult.totalScore ?? calculatedMaxTotal
      })
      setWarnings([...myResult.warnings, ...maxResult.warnings])
      setAnalysis(null)
      setProgress(100)
      setStep(1)
    } catch (ocrError) {
      console.error('OCR error:', ocrError)
      setError(ocrError.message || '识别失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmScores = () => {
    const normalizedMyScores = scores
      .map(item => ({
        subject: normalizeSubject(item.subject),
        score: toNumber(item.score),
        fullScore: toNumber(item.fullScore)
      }))
      .filter(item => item.subject && item.score && item.score > 0)

    const normalizedMaxScores = maxScores
      .map(item => ({
        subject: normalizeSubject(item.subject),
        score: toNumber(item.score),
        fullScore: toNumber(item.fullScore)
      }))
      .filter(item => item.subject && item.score && item.score > 0)

    if (normalizedMyScores.length === 0) {
      setError('请至少保留一条有效的个人成绩')
      return
    }

    const nextWarnings = []
    normalizedMyScores.forEach(item => {
      const upperBound = item.fullScore && item.fullScore > 0 ? Math.max(item.fullScore, 100) + 5 : 160
      if (item.score > upperBound) {
        nextWarnings.push(`${item.subject} 分数 ${item.score} 超出正常范围，请再次确认`)
      }
      if (item.score <= 20 && (!item.fullScore || item.fullScore >= 80)) {
        nextWarnings.push(`${item.subject} 分数 ${item.score} 很低，可能仍然混入了排名数字，请再次确认`)
      }
    })

    setWarnings(nextWarnings)
    setScores(normalizedMyScores)
    setMaxScores(normalizedMaxScores)

    const nextAnalysis = buildAnalysis(normalizedMyScores, normalizedMaxScores, meta, city, grade)
    if (!nextAnalysis) {
      setError('分析所需数据不足，请检查识别结果')
      return
    }

    setError(null)
    setAnalysis(nextAnalysis)
    setStep(2)
  }

  const handleReset = () => {
    if (myImage.preview) URL.revokeObjectURL(myImage.preview)
    if (maxImage.preview) URL.revokeObjectURL(maxImage.preview)

    setStep(0)
    setMyImage(defaultImageSlot())
    setMaxImage(defaultImageSlot())
    setScores([])
    setMaxScores([])
    setMeta(defaultMeta)
    setError(null)
    setWarnings([])
    setAnalysis(null)
    setProgress(0)
  }

  return (
    <div className="min-h-screen py-6 px-4 bg-gradient-to-b from-indigo-50/50 to-white">
      <div className="max-w-md mx-auto">
        <AIAnalysisBanner />

        <StepIndicator currentStep={step} />

        {step === 0 && (
          <div className="animate-fadeIn space-y-4">
            <AIProviderSelector
              value={aiProvider}
              onChange={setAiProvider}
              customKeys={customKeys}
              onCustomKeyChange={handleCustomKeyChange}
            />

            <ImageUploadSlot
              title="学生成绩图"
              description="上传包含各科成绩、总分、班级排名或年级排名的截图"
              slot={myImage}
              onSelect={(file) => handleImageSelect('my', file)}
              onRemove={() => handleImageRemove('my')}
              disabled={uploading}
            />

            <ImageUploadSlot
              title="班级/年级最高分图"
              description="上传包含各科最高分和最高总分的截图"
              slot={maxImage}
              onSelect={(file) => handleImageSelect('max', file)}
              onRemove={() => handleImageRemove('max')}
              disabled={uploading}
            />

            <CitySelector value={city} onChange={setCity} />
            <GradeSelector value={grade} onChange={setGrade} />

            {uploading && (
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <RefreshCw size={18} className="animate-spin text-primary" />
                  <span className="text-sm text-gray-700">正在识别图片内容...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">{progress}%</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleRecognize}
              disabled={!myImage.file || !maxImage.file || uploading}
              className="w-full btn-primary mt-6 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>识别中...</span>
                </>
              ) : (
                <>
                  <span>开始识别</span>
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fadeIn space-y-4">
            <div className="card bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100">
              <p className="text-sm text-gray-600 leading-6">
                已识别出成绩，请先核对并手动修正。确认无误后，再开始进一步分析。
              </p>
            </div>

            {warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <div className="font-medium mb-2">识别提醒</div>
                <ul className="space-y-1">
                  {warnings.map(item => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <SummaryEditor meta={meta} onChange={handleMetaChange} />
            <ScoreEditor
              title="个人成绩"
              scores={scores}
              onScoresChange={setScores}
              summary="个人成绩图里可能同时有分数、班级排名、年级排名。这里每行只保留该科真实分数，排名请填在上方汇总区。"
            />
            <ScoreEditor
              title="最高分参考"
              scores={maxScores}
              onScoresChange={setMaxScores}
              summary="这里每行依次是科目、最高分、满分。如果某科最高分未识别完整，可在这里补录。"
              showFullScore
            />

            <button
              onClick={handleConfirmScores}
              className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              <span>确认成绩并开始分析</span>
            </button>

            <button
              onClick={() => setStep(0)}
              className="w-full btn-secondary mt-2"
            >
              返回重新识别
            </button>
          </div>
        )}

        {step === 2 && analysis && (
          <div className="animate-slideUp space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">分析完成</p>
              <p className="text-xs text-gray-400">
                {city} · {grade} · {AI_PROVIDERS[aiProvider].name}
              </p>
            </div>

            {warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <div className="font-medium mb-2">确认提醒</div>
                <ul className="space-y-1">
                  {warnings.map(item => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            <FreeAnalysisCard analysis={analysis} />
            <PremiumAnalysisCard analysis={analysis} />

            <button
              onClick={handleReset}
              className="w-full btn-secondary mt-4"
            >
              分析新成绩
            </button>
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-gray-400">
          <p>AI 分析仅供参考，需结合实际试卷和学习情况判断</p>
          <p className="mt-1">AIScoreAnalysis v{VERSION} · {BUILD_DATE}</p>
        </footer>
      </div>
    </div>
  )
}
