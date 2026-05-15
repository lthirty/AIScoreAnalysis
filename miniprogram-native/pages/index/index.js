const { EDUCATION_DEPT_LINKS } = require('../../utils/constants')
const { getHistoryRecords, getPreferences, setPreferences } = require('../../utils/storage')
const { buildTrendSummary } = require('../../utils/trend')
const { drawLineChart } = require('../../utils/trendCanvas')

const DEFAULT_CITY = '杭州'
const DEFAULT_AI_CONFIG = {
  mode: 'platform',
  endpoint: '',
  apiKey: '',
  analyzeModel: 'qwen-max-latest',
  ocrModel: 'qwen-vl-max-latest'
}

const AI_MODE_OPTIONS = [
  { value: 'platform', label: '系统默认：阿里百炼' },
  { value: 'custom', label: '自定义API' }
]

const ANALYZE_MODEL_OPTIONS = [
  'qwen-max-latest',
  'qwen-plus-latest'
]

const OCR_MODEL_OPTIONS = [
  'qwen-vl-max-latest',
  'qwen-vl-plus-latest'
]

function normalizeAiConfig(input = {}) {
  return {
    ...DEFAULT_AI_CONFIG,
    ...input
  }
}

Page({
  data: {
    city: DEFAULT_CITY,
    educationLink: '',
    historyRecords: [],
    subjectTrendRows: [],
    showTrendEmpty: true,
    trendExpanded: false,
    aiConfigExpanded: false,
    workflowExpanded: false,
    aiConfig: DEFAULT_AI_CONFIG,
    aiModeOptions: AI_MODE_OPTIONS,
    analyzeModelOptions: ANALYZE_MODEL_OPTIONS,
    ocrModelOptions: OCR_MODEL_OPTIONS,
    aiModeIndex: 0,
    aiModeLabel: AI_MODE_OPTIONS[0].label,
    analyzeModelIndex: 0,
    ocrModelIndex: 0
  },

  onShow() {
    const preferences = getPreferences()
    const city = preferences.city || DEFAULT_CITY
    const historyRecords = getHistoryRecords()
    const trendSummary = buildTrendSummary(historyRecords)
    const aiConfig = normalizeAiConfig(preferences.aiConfig)
    const aiModeIndex = Math.max(0, AI_MODE_OPTIONS.findIndex((item) => item.value === aiConfig.mode))
    const analyzeModelIndex = Math.max(0, ANALYZE_MODEL_OPTIONS.indexOf(aiConfig.analyzeModel))
    const ocrModelIndex = Math.max(0, OCR_MODEL_OPTIONS.indexOf(aiConfig.ocrModel))

    this.setData({
      city,
      educationLink: EDUCATION_DEPT_LINKS[city] || '',
      historyRecords,
      trendSummary,
      subjectTrendRows: (trendSummary && trendSummary.subjects) || [],
      showTrendEmpty: historyRecords.length === 0,
      aiConfig,
      aiModeIndex,
      aiModeLabel: AI_MODE_OPTIONS[aiModeIndex].label,
      analyzeModelIndex,
      ocrModelIndex
    })

    if (historyRecords.length > 0 && this.data.trendExpanded) {
      wx.nextTick(() => this.renderTrendCharts())
    }
  },

  updatePreferences(nextPatch) {
    const current = getPreferences()
    setPreferences({
      ...current,
      ...nextPatch
    })
  },

  onCityInput(event) {
    const city = event.detail.value.trim()
    this.setData({
      city,
      educationLink: EDUCATION_DEPT_LINKS[city] || ''
    })
    this.updatePreferences({ city })
  },

  openEducationLink() {
    const city = this.data.city.trim() || DEFAULT_CITY
    const link = this.data.educationLink
    if (!link) {
      wx.showToast({
        title: '当前城市暂未配置教育局官网',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/pages/webview/index?title=${encodeURIComponent(`${city}教育局`)}&url=${encodeURIComponent(link)}`
    })
  },

  copyEducationLink() {
    const link = this.data.educationLink
    if (!link) {
      wx.showToast({
        title: '当前城市暂未配置教育局官网',
        icon: 'none'
      })
      return
    }
    wx.setClipboardData({
      data: link
    })
  },

  toggleTrendSection() {
    const trendExpanded = !this.data.trendExpanded
    this.setData({ trendExpanded })
    if (trendExpanded && !this.data.showTrendEmpty) {
      wx.nextTick(() => this.renderTrendCharts())
    }
  },

  toggleAiConfigSection() {
    this.setData({
      aiConfigExpanded: !this.data.aiConfigExpanded
    })
  },

  toggleWorkflowSection() {
    this.setData({
      workflowExpanded: !this.data.workflowExpanded
    })
  },

  onAiModeChange(event) {
    const aiModeIndex = Number(event.detail.value)
    const mode = AI_MODE_OPTIONS[aiModeIndex].value
    const aiConfig = {
      ...this.data.aiConfig,
      mode
    }
    this.setData({ aiModeIndex, aiModeLabel: AI_MODE_OPTIONS[aiModeIndex].label, aiConfig })
    this.updatePreferences({ aiConfig })
  },

  onAnalyzeModelChange(event) {
    const analyzeModelIndex = Number(event.detail.value)
    const aiConfig = {
      ...this.data.aiConfig,
      analyzeModel: ANALYZE_MODEL_OPTIONS[analyzeModelIndex]
    }
    this.setData({ analyzeModelIndex, aiConfig })
    this.updatePreferences({ aiConfig })
  },

  onOcrModelChange(event) {
    const ocrModelIndex = Number(event.detail.value)
    const aiConfig = {
      ...this.data.aiConfig,
      ocrModel: OCR_MODEL_OPTIONS[ocrModelIndex]
    }
    this.setData({ ocrModelIndex, aiConfig })
    this.updatePreferences({ aiConfig })
  },

  onEndpointInput(event) {
    const aiConfig = {
      ...this.data.aiConfig,
      endpoint: event.detail.value.trim()
    }
    this.setData({ aiConfig })
    this.updatePreferences({ aiConfig })
  },

  onApiKeyInput(event) {
    const aiConfig = {
      ...this.data.aiConfig,
      apiKey: event.detail.value.trim()
    }
    this.setData({ aiConfig })
    this.updatePreferences({ aiConfig })
  },

  onCustomAnalyzeModelInput(event) {
    const aiConfig = {
      ...this.data.aiConfig,
      analyzeModel: event.detail.value.trim()
    }
    this.setData({ aiConfig })
    this.updatePreferences({ aiConfig })
  },

  onCustomOcrModelInput(event) {
    const aiConfig = {
      ...this.data.aiConfig,
      ocrModel: event.detail.value.trim()
    }
    this.setData({ aiConfig })
    this.updatePreferences({ aiConfig })
  },

  renderTrendCharts() {
    this.renderTrendChart()
    this.renderSubjectTrendCharts()
  },

  renderTrendChart() {
    const points = this.data.trendSummary && this.data.trendSummary.total && this.data.trendSummary.total.points
    if (!points || !points.length) return
    const query = wx.createSelectorQuery()
    query.select('#totalTrendCanvas').fields({ node: true, size: true }).exec((res) => {
      const target = res && res[0]
      if (!target || !target.node) return
      drawLineChart(target.node, target.width, target.height, points, {
        lineColor: '#4f46e5',
        pointColor: '#2563eb',
        showLabels: true
      })
    })
  },

  renderSubjectTrendCharts() {
    const rows = this.data.subjectTrendRows || []
    if (!rows.length) return
    const query = wx.createSelectorQuery()
    query.selectAll('.subject-trend-canvas').fields({ node: true, size: true }).exec((res) => {
      const nodes = res && res[0]
      if (!nodes || !nodes.length) return
      nodes.forEach((target, index) => {
        const row = rows[index]
        if (!row || !row.points || !row.points.length || !target.node) return
        drawLineChart(target.node, target.width, target.height, row.points, {
          lineColor: '#22c55e',
          pointColor: '#16a34a',
          showLabels: false,
          pointRadius: 3,
          lineWidth: 2,
          padding: { top: 12, right: 12, bottom: 18, left: 12 }
        })
      })
    })
  },

  goInput() {
    wx.navigateTo({ url: '/pages/input/index' })
  },

  goLastReport() {
    wx.navigateTo({ url: '/pages/report/index' })
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' })
  }
})
