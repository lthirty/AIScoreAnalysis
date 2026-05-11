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
  RefreshCw,
  PencilLine
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

const ANALYSIS_PROVIDER = {
  name: '阿里百炼',
  apiKey: AI_PROVIDERS.aliyun.apiKey,
  endpoint: AI_PROVIDERS.aliyun.endpoint,
  model: 'qwen-max-latest'
}

const STORAGE_KEYS = {
  user: 'AIScoreAnalysis:user',
  records: 'AIScoreAnalysis:examRecords'
}

const MOCK_WECHAT_USERS = {
  rayna: {
    id: 'mock-wechat-rayna',
    openid: 'mock_openid_rayna',
    nickname: 'Rayna',
    loginType: 'mock-wechat',
    avatar: ''
  },
  xulei: {
    id: 'mock-wechat-xulei',
    openid: 'mock_openid_xulei',
    nickname: 'Xulei',
    loginType: 'mock-wechat',
    avatar: ''
  }
}

const EDUCATION_DEPT_LINKS = {
  北京: 'https://jw.beijing.gov.cn/',
  上海: 'https://edu.sh.gov.cn/',
  广州: 'https://jyj.gz.gov.cn/',
  深圳: 'https://szeb.sz.gov.cn/',
  杭州: 'https://edu.hangzhou.gov.cn/',
  南京: 'https://edu.nanjing.gov.cn/',
  武汉: 'https://jyj.wuhan.gov.cn/',
  成都: 'https://edu.chengdu.gov.cn/',
  重庆: 'https://jw.cq.gov.cn/',
  西安: 'http://edu.xa.gov.cn/',
  苏州: 'https://jyj.suzhou.gov.cn/',
  天津: 'https://jy.tj.gov.cn/',
  青岛: 'http://edu.qingdao.gov.cn/',
  长沙: 'http://jyj.changsha.gov.cn/',
  郑州: 'https://zzjy.zhengzhou.gov.cn/',
  大连: 'https://edu.dl.gov.cn/',
  沈阳: 'http://jyj.shenyang.gov.cn/',
  济南: 'http://jnedu.jinan.gov.cn/',
  福州: 'https://jyj.fuzhou.gov.cn/',
  厦门: 'https://edu.xm.gov.cn/',
  合肥: 'https://jyj.hefei.gov.cn/',
  昆明: 'https://jtj.km.gov.cn/',
  哈尔滨: 'https://www.harbin.gov.cn/haerbin/c104550/ty_list.shtml',
  长春: 'http://jyj.changchun.gov.cn/',
  贵阳: 'https://jyj.guiyang.gov.cn/',
  太原: 'https://jyj.taiyuan.gov.cn/',
  石家庄: 'http://sjzjyj.sjz.gov.cn/',
  兰州: 'https://jyj.lanzhou.gov.cn/',
  乌鲁木齐: 'http://www.urumqi.gov.cn/fjbm/jyj.htm',
  呼和浩特: 'http://jyj.huhhot.gov.cn/'
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

function getEmptyScores() {
  return SUBJECTS.map(subject => ({ subject, score: '', fullScore: '' }))
}

function readJsonStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.warn('Failed to read storage:', error)
    return fallback
  }
}

function writeJsonStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to write storage:', error)
  }
}

function getUserId(user) {
  return user?.id || user?.openid || ''
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return null

  const id = getUserId(user)
  if (!id) return null

  return {
    ...user,
    id,
    openid: user.openid || id,
    nickname: user.nickname || '学生用户',
    loginType: user.loginType || 'mock-wechat',
    loginAt: user.loginAt || user.loginTime || new Date().toISOString()
  }
}

function getStoredUser() {
  return normalizeUser(readJsonStorage(STORAGE_KEYS.user, null))
}

function saveUser(user) {
  const normalizedUser = normalizeUser(user)

  if (normalizedUser) {
    writeJsonStorage(STORAGE_KEYS.user, normalizedUser)
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.user)
  }
}

function sortExamRecords(records) {
  return [...(records || [])].sort((a, b) => {
    const aTime = new Date(a.examDate || a.date || a.createdAt || 0).getTime()
    const bTime = new Date(b.examDate || b.date || b.createdAt || 0).getTime()
    return bTime - aTime
  })
}

function getStoredRecords(userId) {
  const allRecords = readJsonStorage(STORAGE_KEYS.records, {})
  return sortExamRecords(allRecords[userId] || [])
}

function setStoredRecords(userId, records) {
  const allRecords = readJsonStorage(STORAGE_KEYS.records, {})
  allRecords[userId] = sortExamRecords(records).slice(0, 30)
  writeJsonStorage(STORAGE_KEYS.records, allRecords)
}

function createMockWechatUser(userKey) {
  const profile = MOCK_WECHAT_USERS[userKey] || MOCK_WECHAT_USERS.rayna
  return {
    ...profile,
    loginAt: new Date().toISOString()
  }
}

function getExamDate(record) {
  return record?.examDate || record?.date || record?.createdAt?.slice(0, 10) || ''
}

function formatDateLabel(date) {
  if (!date) return '未记录'
  const parts = String(date).split('-')
  return parts.length >= 3 ? `${Number(parts[1])}/${Number(parts[2])}` : date
}

function getRecordSubjectScore(record, subject) {
  const score = (record?.scores || []).find(item => normalizeSubject(item.subject) === subject)
  return toNumber(score?.score)
}

function buildTrendDataset(records) {
  const chronologicalRecords = sortExamRecords(records || []).reverse()
  const subjects = Array.from(new Set([
    ...SUBJECTS,
    ...chronologicalRecords.flatMap(record => (record.scores || []).map(item => normalizeSubject(item.subject)).filter(Boolean))
  ])).filter(Boolean)

  const total = {
    label: '总分',
    points: chronologicalRecords
      .map(record => {
        const totalScore = toNumber(record.totalScore) ?? calculateTotalScore(record.scores || [])
        return {
          date: getExamDate(record),
          score: totalScore,
          classRank: toNumber(record.classRank),
          gradeRank: toNumber(record.gradeRank),
          label: formatDateLabel(getExamDate(record))
        }
      })
      .filter(point => point.date && point.score !== null && point.score > 0)
  }

  const subjectsSeries = subjects
    .map(subject => ({
      label: subject,
      points: chronologicalRecords
        .map(record => {
          const score = getRecordSubjectScore(record, subject)
          return {
            date: getExamDate(record),
            score,
            label: formatDateLabel(getExamDate(record))
          }
        })
        .filter(point => point.date && point.score !== null && point.score > 0)
    }))
    .filter(series => series.points.length > 0)

  return {
    total,
    subjects: subjectsSeries
  }
}

function analyzeScoreSeries(points) {
  if (!points || points.length === 0) {
    return {
      diff: null,
      direction: '暂无数据',
      volatility: 0,
      maxDrop: 0,
      risingCount: 0,
      fallingCount: 0
    }
  }

  if (points.length === 1) {
    return {
      diff: 0,
      direction: '仅一次记录',
      volatility: 0,
      maxDrop: 0,
      risingCount: 0,
      fallingCount: 0
    }
  }

  const deltas = points.slice(1).map((point, index) => {
    return Math.round((point.score - points[index].score) * 10) / 10
  })
  const risingCount = deltas.filter(delta => delta > 0).length
  const fallingCount = deltas.filter(delta => delta < 0).length
  const maxDrop = Math.min(...deltas, 0)
  const maxRise = Math.max(...deltas, 0)
  const scores = points.map(point => point.score)
  const volatility = Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10
  const diff = Math.round((points[points.length - 1].score - points[0].score) * 10) / 10

  let direction = '基本稳定'
  if (risingCount >= fallingCount + 2 && diff > 0) {
    direction = '持续上升'
  } else if (fallingCount >= risingCount + 2 && diff < 0) {
    direction = '持续下降'
  } else if (Math.abs(maxRise) >= 8 && Math.abs(maxDrop) >= 8) {
    direction = '波动明显'
  } else if (diff > 0) {
    direction = '震荡上升'
  } else if (diff < 0) {
    direction = '震荡下降'
  }

  return {
    diff,
    direction,
    volatility,
    maxDrop: Math.abs(maxDrop),
    risingCount,
    fallingCount,
    deltas
  }
}

function buildTrendAnalysis(records, currentScores, currentRecordMeta = {}) {
  const currentRecord = currentScores?.length > 0
    ? {
      id: 'current-analysis',
      examDate: currentRecordMeta.examDate || new Date().toISOString().split('T')[0],
      date: currentRecordMeta.examDate || new Date().toISOString().split('T')[0],
      totalScore: currentRecordMeta.totalScore || calculateTotalScore(currentScores),
      classRank: currentRecordMeta.classRank,
      gradeRank: currentRecordMeta.gradeRank,
      scores: currentScores
    }
    : null
  const trendRecords = currentRecord ? [...(records || []), currentRecord] : (records || [])
  const series = buildTrendDataset(trendRecords)

  if (!series.total.points || series.total.points.length <= 1) {
    return {
      summary: '暂无历史考试记录，本次保存后将作为趋势分析基准。',
      items: [],
      series
    }
  }

  const totalFirst = series.total.points[0]
  const totalLast = series.total.points[series.total.points.length - 1]
  const totalTrend = analyzeScoreSeries(series.total.points)
  const totalDiff = totalTrend.diff || 0
  const items = series.subjects.map(subjectSeries => {
    const points = subjectSeries.points
    const first = points[0]
    const last = points[points.length - 1]
    const trend = analyzeScoreSeries(points)
    const diff = points.length > 1 ? trend.diff : null
    return {
      subject: subjectSeries.label,
      previous: points.length > 1 ? first.score : null,
      current: last.score,
      diff,
      startDate: first.date,
      endDate: last.date,
      points,
      trend,
      status: diff === null ? '新增记录' : trend.direction
    }
  })
  const improved = items.filter(item => item.diff !== null && item.diff > 0)
  const declined = items.filter(item => item.diff !== null && item.diff < 0)

  return {
    summary: `已对比 ${totalFirst.label} 到 ${totalLast.label}：总分${totalDiff >= 0 ? '提升' : '下降'} ${Math.abs(totalDiff)} 分，${improved.length} 科进步，${declined.length} 科退步，${items.length - improved.length - declined.length} 科持平或新增。`,
    total: {
      previous: totalFirst.score,
      current: totalLast.score,
      diff: totalDiff,
      startDate: totalFirst.date,
      endDate: totalLast.date,
      trend: totalTrend,
      status: totalTrend.direction,
      points: series.total.points
    },
    items,
    series
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

function isSeniorGrade(grade) {
  return ['高一', '高二', '高三'].includes(grade)
}

// 各省市高考满分数据（默认参照，部分城市有差异）
const FULL_SCORES = {
  全国卷: {
    语文: 150, 数学: 150, 英语: 150,
    物理: 100, 化学: 100, 生物: 100,
    历史: 100, 地理: 100, 政治: 100
  },
  北京: {
    语文: 150, 数学: 150, 英语: 150,
    物理: 100, 化学: 100, 生物: 100,
    历史: 100, 地理: 100, 政治: 100
  },
  上海: {
    语文: 150, 数学: 150, 英语: 150,
    物理: 100, 化学: 100, 生物: 100,
    历史: 100, 地理: 100, 政治: 100
  },
  浙江: {
    语文: 150, 数学: 150, 英语: 150,
    物理: 100, 化学: 100, 生物: 100,
    历史: 100, 地理: 100, 政治: 100
  }
}

// 初中各科满分（默认120分，部分地区150分）
const JUNIOR_FULL_SCORES = {
  语文: 120, 数学: 120, 英语: 120,
  物理: 100, 化学: 100,
  历史: 100, 地理: 100, 政治: 100
}

// 小学各科满分（默认100分）
const PRIMARY_FULL_SCORES = {
  语文: 100, 数学: 100, 英语: 100
}

function getFullScoreData(city, grade) {
  if (grade.includes('高一') || grade.includes('高二') || grade.includes('高三')) {
    // 高中：优先用城市特定数据，否则用全国卷
    return FULL_SCORES[city] || FULL_SCORES['全国卷']
  } else if (grade.includes('初一') || grade.includes('初二') || grade.includes('初三')) {
    // 初中
    return JUNIOR_FULL_SCORES
  } else {
    // 小学
    return PRIMARY_FULL_SCORES
  }
}

function generateSubjectSelection(scores) {
  const scoreMap = scores.reduce((acc, item) => {
    acc[item.subject] = toNumber(item.score) || 0
    return acc
  }, {})
  const physics = scoreMap.物理 || 0
  const chemistry = scoreMap.化学 || 0
  const biology = scoreMap.生物 || 0
  const geography = scoreMap.地理 || 0
  const politics = scoreMap.政治 || 0
  const history = scoreMap.历史 || 0

  const scienceBase = physics + chemistry
  const thirdSubject = [
    { subject: '生物', score: biology, combo: '物化生', fit: '理工、医学、生命科学方向覆盖更完整' },
    { subject: '地理', score: geography, combo: '物化地', fit: '理工、地理信息、资源环境方向更均衡' },
    { subject: '政治', score: politics, combo: '物化政', fit: '理工基础保留，同时兼顾法学、公安、公共管理等方向' }
  ].sort((a, b) => b.score - a.score)[0]

  if (physics < 45 || chemistry < 45) {
    const fallback = history >= physics ? '史政地' : '物生地'
    return {
      combo: fallback,
      reason: `物理或化学基础偏弱，直接选物化组合风险较高。当前更适合先稳住得分能力，再结合目标专业决定是否保留物理。`,
      actions: [
        '先确认目标专业是否强制要求物理或化学。',
        '用最近两次考试验证物理、化学是否能稳定提升。',
        '不要只看单科兴趣，要看组合后的总分竞争力。'
      ]
    }
  }

  return {
    combo: thirdSubject?.combo || '物化生',
    reason: `物理和化学合计 ${scienceBase} 分，具备保留理工方向的基础。第三科目前以${thirdSubject?.subject || '生物'}更有优势，${thirdSubject?.fit || '专业覆盖更完整'}。`,
    actions: [
      '如果目标是临床、药学、生物相关，优先考虑物化生。',
      '如果地理明显高于生物，且更关注总分稳定性，可考虑物化地。',
      '如果政治成绩突出且目标偏法学、警校、公共管理，可评估物化政。'
    ]
  }
}

function StepIndicator({ currentStep }) {
  const steps = ['录入方式', '确认成绩', 'AI基础分析', 'AI增强分析']

  return (
    <div className="flex items-center justify-center mb-3 overflow-x-auto pb-1">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs
                ${index < currentStep ? 'bg-success text-white' :
                  index === currentStep ? 'bg-primary text-white' :
                  'bg-gray-200 text-gray-500'}`}
            >
              {index < currentStep ? <Check size={15} /> : index + 1}
            </div>
            <span className={`text-xs mt-2 ${index === currentStep ? 'text-primary font-semibold' : 'text-gray-500'}`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-8 sm:w-12 h-1 mx-2 rounded ${index < currentStep ? 'bg-success' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function UserLogin({ user, onLogin, onLogout }) {
  const [loading, setLoading] = useState(false)

  const loginAsMockUser = (userKey) => {
    setLoading(false)
    onLogin(createMockWechatUser(userKey))
  }

  const handleWechatLogin = () => {
    setLoading(true)
    window.setTimeout(() => loginAsMockUser('rayna'), 0)
  }

  if (user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary text-sm font-medium">{user.nickname?.[0] || '用户'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user.nickname}</p>
            <p className="text-xs text-gray-500">模拟微信账号 · 历史成绩独立保存</p>
          </div>
          <button type="button" onClick={onLogout} className="text-xs text-gray-400 hover:text-gray-600">
            退出
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {Object.entries(MOCK_WECHAT_USERS).map(([key, profile]) => {
            const active = getUserId(user) === profile.id
            return (
              <button
                type="button"
                key={profile.id}
                onClick={() => loginAsMockUser(key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-[#07c160] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {profile.nickname}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">调试微信登录</p>
          <p className="text-xs text-gray-500 mt-1">当前使用本地模拟登录，选择 Rayna 或 Xulei 验证多账号历史成绩和趋势分析。</p>
        </div>
        <button
          type="button"
          onClick={handleWechatLogin}
          disabled={loading}
          className="shrink-0 flex items-center justify-center gap-1 px-3 py-2 bg-[#07c160] text-white rounded-lg text-xs hover:bg-[#06ad56] transition-colors"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
          <span>{loading ? '登录中' : '默认登录'}</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(MOCK_WECHAT_USERS).map(([key, profile]) => (
          <button
            type="button"
            key={profile.id}
            onClick={() => loginAsMockUser(key)}
            className="rounded-lg px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-[#07c160] hover:text-white transition-colors"
          >
            {profile.nickname}
          </button>
        ))}
      </div>
    </div>
  )
}

function ScoreLineChart({ title, points, color = '#6366F1', height = 128, yLabel = '分数', showRanks = false }) {
  if (!points || points.length === 0) return null

  const width = 320
  const rankPoints = showRanks
    ? points.flatMap(point => [toNumber(point.classRank), toNumber(point.gradeRank)]).filter(rank => rank !== null && rank > 0)
    : []
  const hasRanks = rankPoints.length > 0
  const padding = { left: 38, right: hasRanks ? 42 : 14, top: 16, bottom: 42 }
  const scores = points.map(point => toNumber(point.score)).filter(score => score !== null)
  const maxScore = Math.max(...scores, 1)
  const yMax = Math.ceil(maxScore / 10) * 10
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const rankBest = hasRanks ? Math.max(1, Math.min(...rankPoints)) : 1
  const rankWorst = hasRanks ? Math.max(...rankPoints) : 1
  const rankRange = Math.max(rankWorst - rankBest, 1)
  const getRankY = (rank) => {
    const numericRank = toNumber(rank)
    if (!numericRank || !hasRanks) return null
    return padding.top + ((numericRank - rankBest) / rankRange) * chartHeight
  }
  const svgPoints = points.map((point, index) => {
    const x = points.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (chartWidth * index) / (points.length - 1)
    const y = padding.top + chartHeight - ((toNumber(point.score) || 0) / yMax) * chartHeight
    return {
      ...point,
      x,
      y,
      classRankY: getRankY(point.classRank),
      gradeRankY: getRankY(point.gradeRank)
    }
  })
  const polyline = svgPoints.map(point => `${point.x},${point.y}`).join(' ')
  const classRankLine = svgPoints
    .filter(point => point.classRankY !== null)
    .map(point => `${point.x},${point.classRankY}`)
    .join(' ')
  const gradeRankLine = svgPoints
    .filter(point => point.gradeRankY !== null)
    .map(point => `${point.x},${point.gradeRankY}`)
    .join(' ')

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-xs text-gray-400">{hasRanks ? `${yLabel} / 排名 / 日期` : `${yLabel} / 日期`}</p>
      </div>
      {hasRanks && (
        <div className="flex items-center gap-3 mb-1 text-[10px] text-gray-500">
          <span className="inline-flex items-center gap-1"><i className="w-3 h-0.5 bg-primary inline-block" />分数</span>
          <span className="inline-flex items-center gap-1"><i className="w-3 h-0.5 bg-emerald-500 inline-block" />班级排名</span>
          <span className="inline-flex items-center gap-1"><i className="w-3 h-0.5 bg-orange-500 inline-block" />年级排名</span>
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#CBD5E1" strokeWidth="1" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#CBD5E1" strokeWidth="1" />
        {hasRanks && (
          <line x1={width - padding.right} y1={padding.top} x2={width - padding.right} y2={height - padding.bottom} stroke="#CBD5E1" strokeWidth="1" />
        )}
        <text x="4" y={padding.top + 4} className="fill-gray-400 text-[10px]">{yMax}</text>
        <text x="4" y={height - padding.bottom + 4} className="fill-gray-400 text-[10px]">0</text>
        {hasRanks && (
          <>
            <text x={width - padding.right + 6} y={padding.top + 4} className="fill-gray-400 text-[10px]">{rankBest}</text>
            <text x={width - padding.right + 6} y={height - padding.bottom + 4} className="fill-gray-400 text-[10px]">{rankWorst}</text>
          </>
        )}
        {svgPoints.length > 1 && (
          <polyline points={polyline} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {hasRanks && classRankLine && (
          <polyline points={classRankLine} fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {hasRanks && gradeRankLine && (
          <polyline points={gradeRankLine} fill="none" stroke="#F97316" strokeWidth="2" strokeDasharray="2 3" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {svgPoints.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#fff" stroke={color} strokeWidth="2" />
            {point.classRankY !== null && (
              <circle cx={point.x} cy={point.classRankY} r="3" fill="#fff" stroke="#10B981" strokeWidth="2" />
            )}
            {point.gradeRankY !== null && (
              <rect x={point.x - 3} y={point.gradeRankY - 3} width="6" height="6" fill="#fff" stroke="#F97316" strokeWidth="2" />
            )}
            <text x={point.x} y={point.y - 8} textAnchor="middle" className="fill-gray-700 text-[10px] font-semibold">
              {point.score}
            </text>
            <g transform={`translate(${point.x}, ${height - 10}) rotate(-35)`}>
              <text textAnchor="end" className="fill-gray-400 text-[9px]">
                {point.label || formatDateLabel(point.date)}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  )
}

function TrendAnalysis({ history, city, grade, onUpdateRecord, onDeleteRecord }) {
  const [showSubjects, setShowSubjects] = useState(true)
  const [editingRecord, setEditingRecord] = useState(null)

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">暂无历史成绩记录</p>
        <p className="text-xs text-gray-400 mt-1">完成至少一次分析后自动保存</p>
      </div>
    )
  }

  const recentHistory = sortExamRecords(history).slice(0, 10)
  const trendDataset = buildTrendDataset(recentHistory)
  const avgScore = recentHistory.reduce((sum, h) => sum + (toNumber(h.totalScore) || 0), 0) / recentHistory.length
  const latestScore = toNumber(recentHistory[0]?.totalScore) || 0
  const firstScore = toNumber(recentHistory[recentHistory.length - 1]?.totalScore) || 0
  const scoreChange = latestScore - firstScore
  const scoreChangePercent = firstScore > 0 ? ((scoreChange / firstScore) * 100).toFixed(1) : 0
  const subjectColors = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#64748B']
  const openRecordEditor = (record) => {
    setEditingRecord({
      ...record,
      scores: (record.scores || []).map(item => ({ ...item })),
      totalScore: record.totalScore ?? '',
      classRank: record.classRank ?? '',
      gradeRank: record.gradeRank ?? ''
    })
  }

  const updateEditingScore = (index, value) => {
    setEditingRecord(prev => {
      const nextScores = [...(prev?.scores || [])]
      nextScores[index] = { ...nextScores[index], score: value }
      const nextTotal = calculateTotalScore(nextScores)
      return { ...prev, scores: nextScores, totalScore: nextTotal }
    })
  }

  const saveEditingRecord = () => {
    if (!editingRecord || !onUpdateRecord) return
    const confirmed = window.confirm(`确认保存 ${getExamDate(editingRecord)} 的考试记录修改吗？`)
    if (!confirmed) return
    onUpdateRecord(editingRecord.id, {
      ...editingRecord,
      totalScore: toNumber(editingRecord.totalScore) || calculateTotalScore(editingRecord.scores || []),
      classRank: toNumber(editingRecord.classRank),
      gradeRank: toNumber(editingRecord.gradeRank),
      scores: (editingRecord.scores || [])
        .map(item => ({
          ...item,
          subject: normalizeSubject(item.subject),
          score: toNumber(item.score)
        }))
        .filter(item => item.subject && item.score !== null && item.score > 0)
    })
    setEditingRecord(null)
  }

  const deleteEditingRecord = () => {
    if (!editingRecord || !onDeleteRecord) return
    const confirmed = window.confirm(`确认删除 ${getExamDate(editingRecord)} 的考试记录吗？删除后无法自动恢复。`)
    if (!confirmed) return
    onDeleteRecord(editingRecord.id)
    setEditingRecord(null)
  }

  const recordList = (
    <div className="pt-3 border-t border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-2">考试记录</p>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {recentHistory.map((h) => (
          <button
            key={h.id || getExamDate(h)}
            onClick={() => openRecordEditor(h)}
            className="w-full flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2 text-left hover:bg-indigo-50"
          >
            <span className="text-gray-500">{getExamDate(h)}</span>
            <span className="font-medium text-gray-700">{h.totalScore}分</span>
            <span className="text-gray-400">
              班{toNumber(h.classRank) || '-'} · 年{toNumber(h.gradeRank) || '-'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-indigo-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="font-semibold text-gray-800">历史趋势</h3>
        </div>
        <button
          onClick={() => setShowSubjects(!showSubjects)}
          className="text-xs text-primary hover:text-indigo-600"
        >
          {showSubjects ? '收起科目' : '查看每科'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{recentHistory.length}</p>
          <p className="text-xs text-gray-500">考试次数</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className={`text-xl font-bold ${scoreChange >= 0 ? 'text-success' : 'text-red-500'}`}>
            {scoreChange >= 0 ? '+' : ''}{scoreChangePercent}%
          </p>
          <p className="text-xs text-gray-500">分数变化</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{avgScore.toFixed(0)}</p>
          <p className="text-xs text-gray-500">平均分</p>
        </div>
      </div>

      <div className="mb-4">
        <ScoreLineChart title="总分趋势" points={trendDataset.total.points} color="#6366F1" height={160} showRanks />
      </div>

      {recordList}

      {showSubjects && (
        <div className="space-y-4 pt-4 mt-4 border-t border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">各科成绩曲线</p>
            <p className="text-xs text-gray-400 mt-1">竖坐标为分数，横坐标为考试日期。</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trendDataset.subjects.map((series, index) => {
              const first = series.points[0]
              const last = series.points[series.points.length - 1]
              const trend = analyzeScoreSeries(series.points)
              const diff = series.points.length > 1 ? trend.diff : 0
              return (
                <div key={series.label} className="space-y-2">
                  <ScoreLineChart
                    title={`${series.label}趋势`}
                    points={series.points}
                    color={subjectColors[index % subjectColors.length]}
                    height={116}
                  />
                  <p className={`text-xs ${diff >= 0 ? 'text-success' : 'text-red-500'}`}>
                    {series.points.length > 1
                      ? `${series.label}：${formatDateLabel(first.date)} 到 ${formatDateLabel(last.date)}，${trend.direction}，${diff >= 0 ? '+' : ''}${diff} 分，波动 ${trend.volatility} 分`
                      : '只有一次记录，暂不能判断变化。'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!showSubjects && (
        <div className="text-xs text-gray-400">
          点击“查看每科”可展开语文、数学、英语等每门学科的日期曲线。
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 px-3 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl max-h-[86svh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-base font-bold text-gray-800">修改考试记录</p>
                <p className="text-xs text-gray-500 mt-1">{getExamDate(editingRecord)} · 点击保存前会二次确认</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-sm text-gray-400">关闭</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">总分</label>
                <input
                  type="number"
                  value={editingRecord.totalScore ?? ''}
                  onChange={(event) => setEditingRecord(prev => ({ ...prev, totalScore: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">班级排名</label>
                <input
                  type="number"
                  value={editingRecord.classRank ?? ''}
                  onChange={(event) => setEditingRecord(prev => ({ ...prev, classRank: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">年级排名</label>
                <input
                  type="number"
                  value={editingRecord.gradeRank ?? ''}
                  onChange={(event) => setEditingRecord(prev => ({ ...prev, gradeRank: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              {(editingRecord.scores || []).map((item, index) => (
                <div key={`${item.subject}-${index}`} className="grid grid-cols-[88px_1fr] gap-2 items-center">
                  <span className="text-sm text-gray-600">{item.subject}</span>
                  <input
                    type="number"
                    value={item.score ?? ''}
                    onChange={(event) => updateEditingScore(index, event.target.value)}
                    className="rounded-lg border border-gray-200 px-2 py-2 text-sm text-center"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={deleteEditingRecord} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-500">
                删除记录
              </button>
              <button onClick={saveEditingRecord} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white">
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="bg-white rounded-xl shadow-md p-3 border border-indigo-100">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="text-primary" size={17} />
        <span className="font-medium text-gray-700">AI 服务商</span>
      </div>
      <div className="flex gap-2">
        {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all relative
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
      <div className="mt-2 space-y-1">
        <input
          type="password"
          placeholder={getPlaceholder(value)}
          value={customKeys[value] || ''}
          onChange={(e) => onCustomKeyChange(value, e.target.value)}
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
    <div className="bg-white rounded-xl shadow-md p-3 space-y-3 border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        {slot.preview && (
          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        )}
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
        <div className="relative rounded-xl overflow-hidden border border-gray-200">
          <img src={slot.preview} alt={title} className="w-full h-40 object-cover bg-gray-50" />
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            ${isDragging ? 'border-primary bg-indigo-50/50 animate-pulse' : 'border-gray-300 hover:border-primary hover:bg-indigo-50/30'}`}
        >
          <div className="w-11 h-11 mx-auto mb-3 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center">
            <Upload className="text-primary" size={21} />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-2">点击或拖拽上传</p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Camera size={14} /> 拍照</span>
            <span className="flex items-center gap-1"><FileText size={14} /> 截图</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ModeChoice({ mode, onChange }) {
  const options = [
    { key: 'upload', label: '导入截图', icon: Upload },
    { key: 'manual', label: '手动输入', icon: PencilLine }
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`h-12 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all
            ${mode === key
              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary'}`}
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
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

function DateSelector({ value, onChange }) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">考试日期</label>
      <input
        type="date"
        value={value || today}
        onChange={(e) => onChange(e.target.value)}
        max={today}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 hover:border-primary transition-colors focus:outline-none focus:border-primary"
      />
    </div>
  )
}

function ScoreEditor({ title, scores, onScoresChange, summary, showFullScore = false, compact = false }) {
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
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
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
        <p className="text-xs text-gray-500 mb-2">{summary}</p>
      )}

      <div className={`grid ${showFullScore ? 'grid-cols-[72px_1fr_1fr_36px]' : 'grid-cols-[72px_1fr_36px]'} gap-2 text-xs text-gray-400 px-2 mb-2`}>
        <span>科目</span>
        <span className="text-center">{showFullScore ? '分数/最高分' : '分数'}</span>
        {showFullScore && <span className="text-center">满分</span>}
        <span />
      </div>

      <div className={`${compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2'}`}>
        {scores.map((item, index) => (
          <div key={`${title}-${index}`} className={`grid ${showFullScore ? 'grid-cols-[64px_1fr_1fr_30px]' : 'grid-cols-[64px_1fr_30px]'} gap-2 items-center bg-white rounded-lg p-2`}>
            <input
              type="text"
              value={item.subject}
              onChange={(e) => handleScoreChange(index, 'subject', e.target.value)}
              placeholder="科目"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              value={item.score}
              onChange={(e) => handleScoreChange(index, 'score', e.target.value)}
              placeholder="分数"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center"
            />
            {showFullScore && (
              <input
                type="number"
                value={item.fullScore ?? ''}
                onChange={(e) => handleScoreChange(index, 'fullScore', e.target.value)}
                placeholder="满分"
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center"
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

function mergeScoreRows(scores, maxScores) {
  const subjectOrder = [...SUBJECTS]
  const subjects = Array.from(new Set([
    ...subjectOrder,
    ...scores.map(item => normalizeSubject(item.subject)).filter(Boolean),
    ...maxScores.map(item => normalizeSubject(item.subject)).filter(Boolean)
  ]))

  return subjects.map(subject => {
    const own = scores.find(item => normalizeSubject(item.subject) === subject)
    const max = maxScores.find(item => normalizeSubject(item.subject) === subject)

    return {
      subject,
      score: own?.score ?? '',
      maxScore: max?.score ?? ''
    }
  }).filter(item => item.score !== '' || item.maxScore !== '' || subjectOrder.includes(item.subject))
}

function CombinedScoreEditor({ title, scores, maxScores, onScoresChange, onMaxScoresChange, summary, fullScoreData = {} }) {
  const rows = mergeScoreRows(scores, maxScores)

  const updateRows = (nextRows) => {
    onScoresChange(nextRows
      .filter(item => item.subject && item.score !== '')
      .map(item => ({ subject: item.subject, score: item.score })))
    onMaxScoresChange(nextRows
      .filter(item => item.subject && item.maxScore !== '')
      .map(item => ({ subject: item.subject, score: item.maxScore })))
  }

  const handleChange = (index, field, value) => {
    const nextRows = [...rows]
    const previous = nextRows[index]?.[field] ?? ''
    if (previous !== '' && previous !== value) {
      const confirmed = window.confirm(`确认把${nextRows[index]?.subject || '该科'}的${field === 'subject' ? '科目' : field === 'score' ? '我的成绩' : '班级最高分'}从“${previous}”修改为“${value}”吗？`)
      if (!confirmed) return
    }
    nextRows[index] = { ...nextRows[index], [field]: value }
    updateRows(nextRows)
  }

  const handleAdd = () => {
    updateRows([...rows, { subject: '', score: '', maxScore: '' }])
  }

  const handleDelete = (index) => {
    const item = rows[index]
    const confirmed = window.confirm(`确认删除${item?.subject || '该行'}成绩吗？删除后需要重新填写。`)
    if (!confirmed) return
    updateRows(rows.filter((_, itemIndex) => itemIndex !== index))
  }

  const isAbnormalRow = (item) => {
    const score = toNumber(item.score)
    const fullScore = toNumber(fullScoreData[normalizeSubject(item.subject)])
    return score !== null && fullScore !== null && fullScore > 0 && score > fullScore
  }

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{rows.length} 行</span>
        </div>
        <button
          onClick={handleAdd}
          className="text-sm text-primary hover:text-indigo-600 flex items-center gap-1"
        >
          <Plus size={16} /> 添加
        </button>
      </div>

      {summary && (
        <p className="text-xs text-gray-500 mb-2">{summary}</p>
      )}

      {rows.some(isAbnormalRow) && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
          发现异常：个人成绩超过该科满分，请重点核对标红科目。
        </div>
      )}

      <div className="grid grid-cols-[64px_1fr_1fr_30px] gap-2 text-xs text-gray-400 px-2 mb-2">
        <span>科目</span>
        <span className="text-center">我的成绩</span>
        <span className="text-center">班级最高分</span>
        <span />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((item, index) => (
          <div
            key={`${item.subject || 'new'}-${index}`}
            className={`grid grid-cols-[64px_1fr_1fr_30px] gap-2 items-center rounded-lg p-2 ${
              isAbnormalRow(item) ? 'bg-red-50 border border-red-300' : 'bg-white'
            }`}
          >
            <input
              type="text"
              value={item.subject}
              onChange={(e) => handleChange(index, 'subject', e.target.value)}
              placeholder="科目"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              value={item.score}
              onChange={(e) => handleChange(index, 'score', e.target.value)}
              placeholder="成绩"
              className={`px-2 py-1.5 text-sm border rounded-lg text-center ${
                isAbnormalRow(item) ? 'border-red-400 text-red-600 font-bold' : 'border-gray-200'
              }`}
            />
            <input
              type="number"
              value={item.maxScore}
              onChange={(e) => handleChange(index, 'maxScore', e.target.value)}
              placeholder="可选填"
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center"
            />
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
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-700">识别汇总</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {items.map(item => (
          <div key={item.key}>
            <label className="block text-xs text-gray-500 mb-1">{item.label}</label>
            <input
              type="number"
              value={meta[item.key]}
              onChange={(e) => onChange(item.key, e.target.value)}
              placeholder={item.placeholder}
              className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function AIAnalysisBanner() {
  return (
    <div className="bg-gradient-to-r from-primary via-secondary to-accent p-1 rounded-xl mb-3">
      <div className="bg-white rounded-lg px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Brain className="text-primary" size={20} />
          <span className="text-base font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI 智能分析
          </span>
          <Brain className="text-secondary" size={20} />
        </div>
      </div>
    </div>
  )
}

function FreeAnalysisCard({ analysis }) {
  if (!analysis) return null

  // Build comparison data - show ALL subjects
  const scoreMap = {}
  analysis.allScores.forEach(s => {
    if (s.subject) {
      scoreMap[s.subject] = { subject: s.subject, score: s.score, maxScore: null, diff: 0, fullScore: analysis.fullScoreData?.[s.subject] || 100 }
    }
  })
  analysis.maxScores && Object.entries(analysis.maxScores).forEach(([subject, maxScore]) => {
    if (scoreMap[subject]) {
      scoreMap[subject].maxScore = maxScore
      scoreMap[subject].diff = maxScore - scoreMap[subject].score
    }
  })
  const comparisonData = Object.values(scoreMap).sort((a, b) => b.diff - a.diff)
  const hasAbnormalScore = comparisonData.some(item => item.fullScore && item.score > item.fullScore)

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-indigo-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="text-primary" size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">AI 简要分析</h3>
          <p className="text-xs text-gray-500">各科成绩对比</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{analysis.average.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">平均分</p>
          </div>
          <div className="bg-violet-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-secondary">{analysis.totalScore}</p>
            <p className="text-xs text-gray-500 mt-1">个人总分</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-warning">{analysis.maxTotalScore || '-'}</p>
            <p className="text-xs text-gray-500 mt-1">最高总分</p>
          </div>
        </div>

        {/* Comparison Table */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <TrendingUp size={16} className="text-accent" /> 本次考试各科成绩对比
          </p>
          {hasAbnormalScore && (
            <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              发现异常：个人成绩超过该科满分，请回到成绩确认页核对标红科目。
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left py-1 px-1">科目</th>
                  <th className="text-center py-1 px-1">自己</th>
                  <th className="text-center py-1 px-1">最高</th>
                  <th className="text-center py-1 px-1">分差</th>
                  <th className="text-center py-1 px-1">满分</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item, idx) => (
                  <tr key={`${item.subject}-${idx}`} className={`border-b last:border-0 ${item.fullScore && item.score > item.fullScore ? 'border-red-100 bg-red-50 font-bold text-red-600' : 'border-gray-100'}`}>
                    <td className={`py-1.5 px-1 font-medium ${item.fullScore && item.score > item.fullScore ? 'text-red-600' : 'text-gray-700'}`}>{item.subject}</td>
                    <td className="text-center py-1.5 px-1">{item.score}</td>
                    <td className="text-center py-1.5 px-1 text-accent">{item.maxScore || '-'}</td>
                    <td className={`text-center py-1.5 px-1 font-medium ${item.diff > 0 ? 'text-warning' : 'text-success'}`}>
                      {item.maxScore ? (item.diff > 0 ? `-${item.diff}` : `+${Math.abs(item.diff)}`) : '-'}
                    </td>
                    <td className="text-center py-1.5 px-1 text-gray-400">{item.fullScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-success/5 rounded-xl p-3 border border-success/20">
            <p className="text-xs font-medium text-success mb-2 flex items-center gap-1">
              <Award size={14} /> 优势科目
            </p>
            <div className="space-y-1">
              {analysis.strengths.length > 0
                ? analysis.strengths.map(item => (
                  <p key={item.subject} className="text-sm text-gray-700">
                    {item.subject} <span className="text-xs text-gray-500">差{item.diff}分</span>
                  </p>
                ))
                : <p className="text-xs text-gray-400">暂无</p>}
            </div>
          </div>
          <div className="bg-warning/5 rounded-xl p-3 border border-warning/20">
            <p className="text-xs font-medium text-warning mb-2 flex items-center gap-1">
              <Target size={14} /> 待提升科目
            </p>
            <div className="space-y-1">
              {analysis.weaknesses.length > 0
                ? analysis.weaknesses.map(item => (
                  <p key={item.subject} className="text-sm text-gray-700">
                    {item.subject} <span className="text-xs text-gray-500">差{item.diff}分</span>
                  </p>
                ))
                : <p className="text-xs text-gray-400">暂无</p>}
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Zap size={16} className="text-primary" /> 学习建议
          </p>
          <ul className="space-y-2">
            {analysis.suggestions.slice(0, 3).map(item => (
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
  const cleanAiReport = sanitizeAiReport(deepAnalysis.aiReport)

  return (
    <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
          <Crown className="text-warning" size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">AI 深度分析</h3>
          <p className="text-xs text-gray-500">专业诊断与建议</p>
        </div>
      </div>

      <div className="space-y-4">
        {cleanAiReport ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {cleanAiReport}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">整体判断</p>
              <p className="text-sm text-gray-600 leading-6">{deepAnalysis.overview}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">分差诊断</p>
              <ul className="space-y-2">
                {deepAnalysis.gapInsights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-warning mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">学习执行方案</p>
              <ul className="space-y-2">
                {deepAnalysis.actionPlan.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-primary mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">考试策略</p>
              <ul className="space-y-2">
                {deepAnalysis.examTips.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-secondary mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-4 shadow-lg shadow-amber-200">
              <p className="text-sm font-medium mb-2">阶段目标</p>
              <p className="text-sm leading-6">{deepAnalysis.nextGoal}</p>
            </div>
          </>
        )}

        <TrendDetailNotice />
      </div>
    </div>
  )
}

function TrendDetailNotice() {
  const [expanded, setExpanded] = useState(true)
  const [mode, setMode] = useState('upload')
  const [paperImage, setPaperImage] = useState(defaultImageSlot)
  const [paperDetail, setPaperDetail] = useState('')

  const handlePaperSelect = (file) => {
    if (paperImage.preview) URL.revokeObjectURL(paperImage.preview)
    setPaperImage({ file, preview: URL.createObjectURL(file) })
  }

  const handlePaperRemove = () => {
    if (paperImage.preview) URL.revokeObjectURL(paperImage.preview)
    setPaperImage(defaultImageSlot())
  }

  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-amber-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-sm font-medium text-gray-800">各科趋势深度分析说明</p>
          <p className="text-xs text-gray-500 mt-1">默认只展示总分和各科分数曲线，不展开分题型趋势诊断。</p>
        </div>
        <ChevronRight className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} size={18} />
      </button>
      {expanded && (
        <div className="mt-3 space-y-3 text-sm text-gray-600 leading-6">
          <p>
            如果需要分析每门学科的真实变化原因，请导入各科试卷照片，或手动输入各科试卷里每个部分的分数和丢分情况，例如英语的选择题、填空题、判断题、作文题等。只有总分和学科总分时，系统只能判断分数曲线变化，不能准确定位题型短板。
          </p>
          <ModeChoice mode={mode} onChange={setMode} />
          {mode === 'upload' ? (
            <ImageUploadSlot
              title="各科试卷照片"
              description="可导入试卷、答题卡或分题型得分截图，后续增强分析会按题型定位短板。"
              slot={paperImage}
              onSelect={handlePaperSelect}
              onRemove={handlePaperRemove}
              disabled={false}
            />
          ) : (
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">手动输入题型得分和丢分情况</label>
              <textarea
                value={paperDetail}
                onChange={(event) => setPaperDetail(event.target.value)}
                placeholder="示例：英语：选择题 30/40，填空题 12/15，作文 18/25；数学：选择题错2题，函数大题丢8分..."
                className="w-full min-h-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-2 text-xs text-gray-400">当前为调试入口，信息暂不提交；后续会接入增强分析模型。</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubjectSelectionCard({ selection }) {
  if (!selection) return null

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-emerald-100">
      <div className="flex items-center gap-2 mb-3">
        <Target size={18} className="text-success" />
        <div>
          <h3 className="font-semibold text-gray-800">高中选科建议</h3>
          <p className="text-xs text-gray-500">基于当前成绩结构和排名判断</p>
        </div>
      </div>
      <div className="bg-emerald-50 rounded-xl p-3 mb-3">
        <p className="text-2xl font-bold text-success">{selection.combo}</p>
        <p className="text-sm text-gray-600 mt-2 leading-6">{selection.reason}</p>
      </div>
      <ul className="space-y-2">
        {selection.actions.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-success mt-0.5">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AnalysisEvidenceCard({ analysis }) {
  if (!analysis?.calculation) return null

  const [expanded, setExpanded] = useState(false)
  const modelTrace = analysis.modelTrace || {}
  const calculation = analysis.calculation

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-slate-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-primary" />
          <div>
            <h3 className="font-semibold text-gray-800">调试依据</h3>
            <p className="text-xs text-gray-500">模型、公式和规则，默认收起</p>
          </div>
        </div>
        <ChevronRight className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} size={18} />
      </button>

      {expanded && <div className="space-y-3 text-sm text-gray-600 mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">图片识别模型</p>
            <p className="font-semibold text-gray-800 mt-1">{modelTrace.visionModel}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">数据分析模型</p>
            <p className="font-semibold text-gray-800 mt-1">{modelTrace.analysisModel}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <p>总分：{calculation.totalScoreFormula}</p>
          <p>平均分：{calculation.averageFormula}</p>
          <p>{calculation.rankingRule}</p>
          <p>{calculation.strengthRule}</p>
          <p>{calculation.weaknessRule}</p>
          <p>{calculation.cityBasis}</p>
          <p>{calculation.gradeBasis}</p>
        </div>
      </div>}
    </div>
  )
}

function EducationDeptAppendix({ currentCity }) {
  const [selectedCity, setSelectedCity] = useState(currentCity || '杭州')
  const [customCity, setCustomCity] = useState('')
  const effectiveCity = customCity.trim() || selectedCity
  const url = EDUCATION_DEPT_LINKS[effectiveCity]
  const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(`${effectiveCity} 教育局 官方网站`)}`

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-slate-100">
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-gray-800">
          附录：当地教育部门网址查询
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-gray-500 leading-5">
            可查看当地教育部门公开信息，了解考试政策、招生安排、学业要求等。不同城市政策会变化，最终以官方发布为准。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={selectedCity}
              onChange={(event) => {
                setSelectedCity(event.target.value)
                setCustomCity('')
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
            >
              {Object.keys(EDUCATION_DEPT_LINKS).map(cityName => (
                <option key={cityName} value={cityName}>{cityName}</option>
              ))}
            </select>
            <input
              type="text"
              value={customCity}
              onChange={(event) => setCustomCity(event.target.value)}
              placeholder="或直接填写城市"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
          <a
            href={url || searchUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white"
          >
            {url ? `打开${effectiveCity}教育部门官网` : `搜索${effectiveCity}教育部门官网`}
          </a>
        </div>
      </details>
    </div>
  )
}

function EnhancedAnalysisCta({ analysis, onStart }) {
  const weakSubject = analysis?.weaknesses?.[0]?.subject
  const strongSubject = analysis?.strengths?.[0]?.subject

  return (
    <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-xl shadow-indigo-200">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <Crown size={22} className="text-amber-300" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold">解锁 AI 增强分析</p>
          <p className="mt-2 text-sm leading-6 text-indigo-100">
            基础分析已经给出总分、排名、分差和趋势。增强分析会进一步整合城市与年级特点、优势科目{strongSubject ? `（${strongSubject}）` : ''}、待提升科目{weakSubject ? `（${weakSubject}）` : ''}和阶段目标，生成更适合家长决策和学生执行的深度报告。
          </p>
          <p className="mt-2 text-xs text-amber-200">
            调试阶段无需付费，点击即可进入。正式版可作为付费增强服务。
          </p>
        </div>
      </div>
      <button
        onClick={onStart}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-3 text-base font-bold text-slate-950 shadow-lg shadow-orange-900/20"
      >
        AI增强分析
      </button>
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

function sanitizeAiReport(report) {
  if (!report || typeof report !== 'string') return ''

  return report
    .split('\n')
    .map(line => line.replace(/^\s{0,3}#{1,6}\s*/, ''))
    .join('\n')
    .trim()
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

function formatTrendForPrompt(trendAnalysis) {
  if (!trendAnalysis?.series?.total?.points || trendAnalysis.series.total.points.length <= 1) {
    return '历史趋势数据不足：当前少于2次考试记录。'
  }

  const totalLine = trendAnalysis.total
    ? `总分：${trendAnalysis.total.points.map(point => `${point.date}:${point.score}`).join(' -> ')}，变化${trendAnalysis.total.diff >= 0 ? '+' : ''}${trendAnalysis.total.diff}分。`
    : `总分：${trendAnalysis.series.total.points.map(point => `${point.date}:${point.score}`).join(' -> ')}。`
  const subjectLines = trendAnalysis.items
    .map(item => {
      const points = item.points?.map(point => `${point.date}:${point.score}`).join(' -> ') || `${item.current}`
      const trend = item.trend || analyzeScoreSeries(item.points || [])
      const diffText = item.diff === null ? '暂无可比变化' : `首末变化${item.diff >= 0 ? '+' : ''}${item.diff}分`
      return `${item.subject}：${points}，${diffText}，整体趋势${trend.direction}，期间波动${trend.volatility || 0}分，上升${trend.risingCount || 0}次，下降${trend.fallingCount || 0}次，最大单次下滑${trend.maxDrop || 0}分`
    })
    .join('\n')

  return [totalLine, subjectLines].filter(Boolean).join('\n')
}

function buildDeepAnalysisPrompt(scores, maxScores, meta, city, grade, subjectSelection = null, trendAnalysis = null) {
  const scoreText = scores.map(s => `${s.subject}:${s.score}`).join(', ')
  const maxText = maxScores.length > 0 ? maxScores.map(s => `${s.subject}:${s.maxScore || s.score}`).join(', ') : '未提供'
  const subjectSelText = subjectSelection ? `本地初步建议：${subjectSelection.combo}。理由：${subjectSelection.reason}` : '无'
  const fullScoreData = getFullScoreData(city, grade)
  const fullScoreText = Object.entries(fullScoreData).map(([k, v]) => `${k}:${v}分`).join(', ')
  const trendText = formatTrendForPrompt(trendAnalysis)

  return [
    '你是资深的高考成绩分析专家，擅长学情诊断、选科决策和个性化学习规划。',
    '',
    '【学生基本信息】',
    `城市：${city}`,
    `年级：${grade}`,
    '',
    '【各科满分参考】',
    fullScoreText,
    '',
    '【本次成绩数据】',
    `各科成绩：${scoreText}`,
    `班级最高分参考：${maxText}`,
    `总分：${meta.totalScore || '未提供'}`,
    '',
    '【历史趋势数据】',
    '以下数据用于分析成绩曲线，竖坐标是分数，横坐标是考试日期：',
    trendText,
    '',
    '【本地初步分析参考】',
    subjectSelText,
    '',
    '【分析任务】',
    '请基于上述数据，输出专业的学情诊断报告：',
    '',
    '【输出要求】',
    '1、语言通俗易懂，适合家长和学生阅读',
    '2、分析需有数据支撑，结论明确',
    '3、选科建议需与本地建议保持方向一致，如有调整请说明理由',
    '4、建议具体可执行，避免空泛',
    '5、标题前不要使用 # 号，也不要输出 Markdown 标题符号',
    '6、不要默认输出“各科趋势分析与建议”这个独立章节；如需提到趋势，只在核心诊断或提分优先级中简要引用',
    '7、判断趋势时必须看完整分数序列，包括连续上升/下降次数、波动幅度和最大单次下滑，不能只比较第一次和最后一次',
    '8、没有看到试卷照片、题型得分或每部分丢分数据时，绝不能编造“阅读理解、作文、选择题、填空题”等具体失分原因',
    '9、如果缺少题型/小题数据，只能说明目前只能基于总分、各科分数、最高分和历史曲线判断；要提示客户导入各科试卷照片，或输入各科试卷里每个部分的分数和丢分情况，例如英语的选择题、填空题、判断题、作文题等',
    '',
    '【报告正文】（请严格按以下格式输出，每项200字以内；标题不要带 #）',
    '',
    '1、核心诊断',
    '[一句话总结整体表现，定位所在分数段水平]',
    '',
    '2、各科分差分析',
    '[只能逐科分析与班级最高分/满分的分差和历史曲线表现。不要推断具体题型失分；如需定位失分原因，请提示客户导入各科试卷照片，或输入每个部分的得分和丢分情况，例如英语选择题、填空题、判断题、作文题等]',
    '',
    '3、选科建议（高中生必填）',
    '[推荐组合及理由，或说明维持现状的原因]',
    '',
    '4、提分优先级',
    '[按紧急程度排序：最该先补哪科，为什么]',
    '',
    '5、具体可执行建议',
    '[3-5条立即可行动的具体措施]',
    '',
    '6、阶段目标',
    '[下次考试的合理目标及达成路径]'
  ].join('\n')
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

function buildAnalysis(myScores, maxScores, meta, city, grade, modelTrace = {}, historicalRecords = [], examDate = '') {
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
  const subjectSelection = isSeniorGrade(grade) ? generateSubjectSelection(validScores) : null
  const trendAnalysis = buildTrendAnalysis(historicalRecords, validScores, { examDate, totalScore, classRank, gradeRank })

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
    subjectSelection,
    trendAnalysis,
    modelTrace,
    calculation: {
      totalScoreFormula: `${validScores.map(item => `${item.subject}${item.score}`).join(' + ')} = ${totalScore}`,
      averageFormula: `${totalScore} / ${validScores.length} = ${average.toFixed(1)}`,
      rankingRule: '优先使用年级排名/班级排名判断；没有排名时使用平均分区间估算。',
      strengthRule: maxScores.length > 0 ? '与最高分差距 <= 10 分判定为优势科目。' : '高于个人平均分 8 分以上判定为优势科目。',
      weaknessRule: maxScores.length > 0 ? '与最高分差距 >= 15 分判定为待提升科目。' : '低于个人平均分 8 分以上判定为待提升科目。',
      cityBasis: `${city}：${cityProfile.feature}`,
      gradeBasis: `${grade}：${gradeProfile.stage}，${gradeProfile.advice}`
    },
    allScores: validScores,
    strengths,
    weaknesses,
    suggestions,
    fullScoreData: getFullScoreData(city, grade),
    maxScores: maxScores.reduce((acc, item) => {
      const subject = normalizeSubject(item.subject)
      const score = toNumber(item.score)
      if (subject && score) {
        acc[subject] = score
      }
      return acc
    }, {}),
    deepAnalysis: {
      overview: `共${validScores.length}科，平均分${average.toFixed(1)}，总分${totalScore}。${cityProfile.feature}。${grade}处于${gradeProfile.stage}，${weaknesses.length > 0 ? '成绩有短板，适合先补弱。' : '成绩均衡，可稳步提升。'}`,
      gapInsights,
      actionPlan,
      examTips,
      nextGoal,
      subjectSelectionHint: subjectSelection ? `${subjectSelection.combo}：` : '',
      aiReport: ''
    }
  }
}

export default function App() {
  const [step, setStep] = useState(0)
  const [inputMode, setInputMode] = useState('upload')
  const [myImage, setMyImage] = useState(defaultImageSlot)
  const [maxImage, setMaxImage] = useState(defaultImageSlot)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scores, setScores] = useState([])
  const [maxScores, setMaxScores] = useState([])
  const [meta, setMeta] = useState(defaultMeta)
  const [city, setCity] = useState('杭州')
  const [grade, setGrade] = useState('高一')
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [aiProvider, setAiProvider] = useState('aliyun')
  const [analyzing, setAnalyzing] = useState(false)
  const [customKeys, setCustomKeys] = useState({
    aliyun: '',
    minimax: '',
    deepseek: ''
  })
  const [analysis, setAnalysis] = useState(null)
  const [user, setUser] = useState(() => getStoredUser())
  const [history, setHistory] = useState(() => {
    const storedUser = getStoredUser()
    return storedUser ? getStoredRecords(getUserId(storedUser)) : []
  })

  const handleLogin = (userData) => {
    const nextUser = normalizeUser(userData)
    if (!nextUser) return

    setUser(nextUser)
    saveUser(nextUser)
    setHistory(getStoredRecords(getUserId(nextUser)))
  }

  const handleLogout = () => {
    setUser(null)
    setHistory([])
    saveUser(null)
  }

  const handleUpdateHistoryRecord = (recordId, nextRecord) => {
    if (!user) return
    const userId = getUserId(user)
    const nextHistory = getStoredRecords(userId).map(record => {
      if (record.id !== recordId) return record
      return {
        ...record,
        ...nextRecord,
        id: record.id,
        updatedAt: new Date().toISOString()
      }
    })
    setStoredRecords(userId, nextHistory)
    setHistory(getStoredRecords(userId))
  }

  const handleDeleteHistoryRecord = (recordId) => {
    if (!user) return
    const userId = getUserId(user)
    const nextHistory = getStoredRecords(userId).filter(record => record.id !== recordId)
    setStoredRecords(userId, nextHistory)
    setHistory(getStoredRecords(userId))
  }

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

  const runDeepAnalysis = async (baseAnalysis, normalizedMyScores, normalizedMaxScores) => {
    const response = await fetch(ANALYSIS_PROVIDER.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customKeys.aliyun?.trim() || ANALYSIS_PROVIDER.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ANALYSIS_PROVIDER.model,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: buildDeepAnalysisPrompt(
            normalizedMyScores,
            normalizedMaxScores,
            meta,
            city,
            grade,
            baseAnalysis?.subjectSelection,
            baseAnalysis?.trendAnalysis
          )
        }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`深度分析调用失败: ${errorData.error?.message || response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  const handleRecognize = async () => {
    if (!city || !grade) {
      alert('请选择城市和年级')
      return
    }
    if (!myImage.file) {
      alert('请上传成绩截图')
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
      let maxResult = { scores: [], totalScore: null, warnings: [] }
      setProgress(maxImage.file ? 60 : 85)
      if (maxImage.file) {
        maxResult = await runOcr(maxImage.file, 'max', aiProvider)
      }
      setProgress(85)

      if (myResult.scores.length === 0) {
        throw new Error('个人成绩图未识别到有效分数，请更换更清晰的截图')
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

  const handleConfirmScores = async () => {
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
      if (item.score <= 20 && (!item.fullScore || item.fullScore >= 80)) {
        nextWarnings.push(`${item.subject} 分数 ${item.score} 很低，可能仍然混入了排名数字，请再次确认`)
      }
    })

    setWarnings(nextWarnings)
    setScores(normalizedMyScores)
    setMaxScores(normalizedMaxScores)

    const modelTrace = {
      visionModel: inputMode === 'upload' ? `${AI_PROVIDERS[aiProvider].name} ${AI_PROVIDERS[aiProvider].model}` : '手动输入，未使用图片识别模型',
      analysisModel: `${ANALYSIS_PROVIDER.name} ${ANALYSIS_PROVIDER.model}`
    }
    const nextAnalysis = buildAnalysis(normalizedMyScores, normalizedMaxScores, meta, city, grade, modelTrace, history, examDate)
    if (!nextAnalysis) {
      setError('分析所需数据不足，请检查识别结果')
      return
    }

    setError(null)
    setAnalyzing(true)

    try {
      const aiReport = await runDeepAnalysis(nextAnalysis, normalizedMyScores, normalizedMaxScores)
      setAnalysis({
        ...nextAnalysis,
        deepAnalysis: {
          ...nextAnalysis.deepAnalysis,
          aiReport
        }
      })
    } catch (analysisError) {
      console.error('Deep analysis error:', analysisError)
      setWarnings(prev => [...prev, analysisError.message || '深度分析模型调用失败，已展示本地分析结果'])
      setAnalysis(nextAnalysis)
    } finally {
      setAnalyzing(false)
      if (user) {
        const userId = getUserId(user)
        const totalScore = nextAnalysis?.totalScore || normalizedMyScores.reduce((sum, item) => sum + item.score, 0)
        const nextHistory = sortExamRecords([
          {
            id: `${userId}-${Date.now()}`,
            userId,
            openid: user.openid,
            nickname: user.nickname,
            date: examDate,
            examDate,
            city,
            grade,
            totalScore,
            classRank: toNumber(meta.classRank),
            gradeRank: toNumber(meta.gradeRank),
            scores: normalizedMyScores,
            maxScores: normalizedMaxScores,
            createdAt: new Date().toISOString()
          },
          ...getStoredRecords(userId)
        ]).slice(0, 30)
        setStoredRecords(userId, nextHistory)
        setHistory(nextHistory)
      }
      setStep(2)
    }
  }

  const handleManualInput = () => {
    if (!city || !grade) {
      alert('请选择城市和年级')
      return
    }

    setScores(getEmptyScores())
    setMaxScores([])
    setMeta(defaultMeta())
    setWarnings([])
    setError(null)
    setAnalysis(null)
    setStep(1)
  }

  const handleInputModeChange = (mode) => {
    setInputMode(mode)
    setError(null)

    if (mode === 'manual' && scores.length === 0) {
      setScores(getEmptyScores())
      setMaxScores([])
      setMeta(defaultMeta())
      setWarnings([])
      setAnalysis(null)
    }
  }

  const handleReset = () => {
    if (myImage.preview) URL.revokeObjectURL(myImage.preview)
    if (maxImage.preview) URL.revokeObjectURL(maxImage.preview)

    setStep(0)
    setInputMode('upload')
    setMyImage(defaultImageSlot())
    setMaxImage(defaultImageSlot())
    setScores([])
    setMaxScores([])
    setMeta(defaultMeta())
    setError(null)
    setWarnings([])
    setAnalysis(null)
    setAnalyzing(false)
    setProgress(0)
  }

  return (
    <div className="min-h-screen lg:h-[100svh] py-3 px-3 bg-gradient-to-b from-indigo-50/50 to-white lg:overflow-hidden">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        <AIAnalysisBanner />

        <div className="mb-3">
          <UserLogin user={user} onLogin={handleLogin} onLogout={handleLogout} />
        </div>

        <StepIndicator currentStep={step} />

        {step === 0 && (
          <div className="animate-fadeIn grid lg:grid-cols-[1fr_1.05fr] gap-3 min-h-0">
            <div className="space-y-3">
              <AIProviderSelector
                value={aiProvider}
                onChange={setAiProvider}
                customKeys={customKeys}
                onCustomKeyChange={handleCustomKeyChange}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CitySelector value={city} onChange={setCity} />
                <GradeSelector value={grade} onChange={setGrade} />
                <DateSelector value={examDate} onChange={setExamDate} />
              </div>

              <ModeChoice mode={inputMode} onChange={handleInputModeChange} />

              {user && (
                <TrendAnalysis
                  history={history}
                  city={city}
                  grade={grade}
                  onUpdateRecord={handleUpdateHistoryRecord}
                  onDeleteRecord={handleDeleteHistoryRecord}
                />
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {inputMode === 'upload' ? (
                <>
                  <ImageUploadSlot
                    title="成绩截图"
                    description="导入学生成绩截图，系统会识别各科分数、总分和排名。"
                    slot={myImage}
                    onSelect={(file) => handleImageSelect('my', file)}
                    onRemove={() => handleImageRemove('my')}
                    disabled={uploading}
                  />

                  <ImageUploadSlot
                    title="最高分截图（可选）"
                    description="有班级/年级最高分截图时导入，可提升对比分析质量。"
                    slot={maxImage}
                    onSelect={(file) => handleImageSelect('max', file)}
                    onRemove={() => handleImageRemove('max')}
                    disabled={uploading}
                  />

                  {uploading && (
                    <div className="bg-white rounded-xl shadow-md p-3 border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <RefreshCw size={18} className="animate-spin text-primary" />
                        <span className="text-sm text-gray-700">正在识别图片内容...</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleRecognize}
                    disabled={!myImage.file || uploading}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw size={20} className="animate-spin" />
                        <span>识别中...</span>
                      </>
                    ) : (
                      <>
                        <span>导入并识别</span>
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <PencilLine size={22} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">手动输入成绩</h3>
                      <p className="text-sm text-gray-500 mt-1">在当前页面填写各科分数、总分和排名。</p>
                    </div>
                  </div>

                  <SummaryEditor meta={meta} onChange={handleMetaChange} />
                  <CombinedScoreEditor
                    title="成绩输入"
                    scores={scores}
                    maxScores={maxScores}
                    onScoresChange={setScores}
                    onMaxScoresChange={setMaxScores}
                    fullScoreData={getFullScoreData(city, grade)}
                    summary="上排为自己成绩，下排为班级最高分（不填则不显示分差）"
                  />

                  <button
                    onClick={handleConfirmScores}
                    disabled={analyzing}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw size={20} className="animate-spin" />
                        <span>分析中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        <span>直接生成分析</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fadeIn grid lg:grid-cols-[0.85fr_1.15fr] gap-3 min-h-0">
            <div className="space-y-3">
              <SummaryEditor meta={meta} onChange={handleMetaChange} />

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

              <div className="bg-white rounded-xl shadow-md p-3 border border-gray-100">
                <p className="text-sm text-gray-600 leading-6">
                  核对每科真实分数。班级排名和年级排名填在汇总区，不放进科目分数。
                </p>
              </div>

              <button
                onClick={handleConfirmScores}
                disabled={analyzing}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>确认并分析</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setStep(0)}
                className="w-full btn-secondary"
              >
                返回
              </button>
            </div>

            <div className="space-y-3 lg:max-h-[calc(100svh-150px)] lg:overflow-y-auto lg:pr-1">
              <CombinedScoreEditor
                title="成绩确认"
                scores={scores}
                maxScores={maxScores}
                onScoresChange={setScores}
                onMaxScoresChange={setMaxScores}
                fullScoreData={getFullScoreData(city, grade)}
                summary="上排为自己成绩，下排为班级最高分（不填则不显示分差）"
              />
            </div>
          </div>
        )}

        {step === 2 && analysis && (
          <div className="animate-slideUp grid lg:grid-cols-[0.95fr_1.05fr] gap-3 min-h-0">
            <div className="space-y-3">
              <div className="text-center bg-white rounded-xl shadow-md p-3 border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">AI基础分析完成</p>
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
            {user && (
              <TrendAnalysis
                history={history}
                city={city}
                grade={grade}
                onUpdateRecord={handleUpdateHistoryRecord}
                onDeleteRecord={handleDeleteHistoryRecord}
              />
            )}
            <SubjectSelectionCard selection={analysis.subjectSelection} />
            <AnalysisEvidenceCard analysis={analysis} />
            <button
              onClick={() => setStep(1)}
              className="w-full btn-secondary"
            >
              返回上一步
            </button>
            </div>

            <div className="space-y-3 lg:max-h-[calc(100svh-150px)] lg:overflow-y-auto lg:pr-1">
              <EnhancedAnalysisCta analysis={analysis} onStart={() => setStep(3)} />
              <EducationDeptAppendix currentCity={city} />
              <button
                onClick={handleReset}
                className="w-full btn-secondary"
              >
                重新录入成绩
              </button>
            </div>
          </div>
        )}

        {step === 3 && analysis && (
          <div className="animate-slideUp grid lg:grid-cols-[0.85fr_1.15fr] gap-3 min-h-0">
            <div className="space-y-3">
              <div className="text-center bg-white rounded-xl shadow-md p-3 border border-amber-100">
                <p className="text-sm font-semibold text-amber-600 mb-1">AI增强分析</p>
                <p className="text-xs text-gray-400">
                  调试阶段已跳过付费验证 · 正式版此处接入支付
                </p>
              </div>
              <FreeAnalysisCard analysis={analysis} />
              <button
                onClick={() => setStep(2)}
                className="w-full btn-secondary"
              >
                返回AI基础分析
              </button>
            </div>

            <div className="lg:max-h-[calc(100svh-150px)] lg:overflow-y-auto lg:pr-1">
              <PremiumAnalysisCard analysis={analysis} />
            </div>
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
