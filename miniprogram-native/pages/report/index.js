const { request } = require('../../utils/request')
const { showError } = require('../../utils/error')
const { SUBJECTS, EDUCATION_DEPT_LINKS } = require('../../utils/constants')
const { uploadFileForUrl } = require('../../utils/upload')
const { getEnhancedReport, getHistoryRecords, getLastReport, getPreferences, setEnhancedReport } = require('../../utils/storage')
const { buildTrendSummary } = require('../../utils/trend')
const { drawLineChart } = require('../../utils/trendCanvas')

const ENHANCED_POLL_INTERVAL_MS = 2000
const ENHANCED_MAX_WAIT_MS = 90000

function createEmptyMaterial() {
  return {
    subjectIndex: 0,
    subject: SUBJECTS[0],
    detail: '',
    imagePath: '',
    imageName: ''
  }
}

Page({
  data: {
    hasReport: false,
    payload: null,
    report: null,
    examSummary: '',
    historyRecords: [],
    trendSummary: null,
    subjectTrendRows: [],
    trendExpanded: false,
    city: '杭州',
    educationLink: '',
    subjectOptions: SUBJECTS,
    materialEntries: [createEmptyMaterial()],
    enhancedReport: null,
    enhancedLoading: false,
    enhancedStatusText: ''
  },

  onShow() {
    const last = getLastReport()
    const report = last ? last.report : null
    const enhanced = getEnhancedReport()
    const preferences = getPreferences()
    const historyRecords = getHistoryRecords()
    const city = (last && last.payload && last.payload.student && last.payload.student.city) || preferences.city || '杭州'
    const exam = last && last.payload ? last.payload.exam || {} : {}
    const examSummary = [exam.date, exam.name].filter(Boolean).join(' · ')
    const trendSummary = buildTrendSummary(historyRecords)
    this.setData({
      hasReport: Boolean(last && last.report),
      payload: last ? last.payload : null,
      report,
      examSummary,
      historyRecords,
      trendSummary,
      subjectTrendRows: trendSummary.subjects || [],
      city,
      educationLink: EDUCATION_DEPT_LINKS[city] || '',
      enhancedReport: enhanced && last && enhanced.reportKey === this.getReportKey(last) ? enhanced.report : null
    })
    if (historyRecords.length > 0 && this.data.trendExpanded) {
      wx.nextTick(() => this.renderTrendCharts())
    }
  },

  goInput() {
    wx.navigateTo({ url: '/pages/input/index' })
  },

  openEducationLink() {
    const city = this.data.city.trim() || '杭州'
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

  renderTrendCharts() {
    this.renderTotalTrendChart()
    this.renderSubjectTrendCharts()
  },

  toggleTrendSection() {
    const trendExpanded = !this.data.trendExpanded
    this.setData({ trendExpanded })
    if (trendExpanded && this.data.historyRecords.length > 0) {
      wx.nextTick(() => this.renderTrendCharts())
    }
  },

  renderTotalTrendChart() {
    const points = this.data.trendSummary && this.data.trendSummary.total && this.data.trendSummary.total.points
    if (!points || !points.length) return
    const query = wx.createSelectorQuery()
    query.select('#reportTotalTrendCanvas').fields({ node: true, size: true }).exec((res) => {
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
    query.selectAll('.report-subject-trend-canvas').fields({ node: true, size: true }).exec((res) => {
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

  getReportKey(last) {
    const payload = last ? last.payload : null
    const report = last ? last.report : null
    return JSON.stringify({
      student: payload && payload.student,
      exam: payload && payload.exam,
      subjects: payload && payload.subjects,
      summary: report && report.summary
    })
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  onMaterialSubjectChange(event) {
    const index = Number(event.currentTarget.dataset.index)
    const subject = this.data.subjectOptions[Number(event.detail.value)]
    const materialEntries = [...this.data.materialEntries]
    materialEntries[index] = {
      ...materialEntries[index],
      subjectIndex: Number(event.detail.value),
      subject
    }
    this.setData({ materialEntries })
  },

  onMaterialDetailInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    const materialEntries = [...this.data.materialEntries]
    materialEntries[index] = {
      ...materialEntries[index],
      detail: event.detail.value
    }
    this.setData({ materialEntries })
  },

  chooseMaterialImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths && res.tempFilePaths[0]
        const file = res.tempFiles && res.tempFiles[0]
        if (!filePath) return
        const materialEntries = [...this.data.materialEntries]
        materialEntries[index] = {
          ...materialEntries[index],
          imagePath: filePath,
          imageName: file && file.name ? file.name : filePath.split('\\').pop().split('/').pop()
        }
        this.setData({ materialEntries })
      }
    })
  },

  removeMaterialImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    const materialEntries = [...this.data.materialEntries]
    materialEntries[index] = {
      ...materialEntries[index],
      imagePath: '',
      imageName: ''
    }
    this.setData({ materialEntries })
  },

  addMaterialRow() {
    this.setData({
      materialEntries: [...this.data.materialEntries, createEmptyMaterial()]
    })
  },

  removeMaterialRow(event) {
    const index = Number(event.currentTarget.dataset.index)
    const next = this.data.materialEntries.filter((_, itemIndex) => itemIndex !== index)
    this.setData({
      materialEntries: next.length ? next : [createEmptyMaterial()]
    })
  },

  async prepareEnhancedMaterials() {
    const prepared = []
    for (const entry of this.data.materialEntries) {
      const hasDetail = Boolean((entry.detail || '').trim())
      const hasImage = Boolean(entry.imagePath)
      if (!hasDetail && !hasImage) continue
      let imageUrl = ''
      if (hasImage) {
        const uploaded = await uploadFileForUrl({
          filePath: entry.imagePath,
          type: entry.subject,
          folder: 'enhanced-materials'
        })
        imageUrl = uploaded.fileUrl
      }
      prepared.push({
        subject: entry.subject,
        input_type: hasDetail && hasImage ? 'image+text' : (hasImage ? 'image' : 'text'),
        detail: entry.detail || '',
        image_url: imageUrl,
        image_name: entry.imageName || ''
      })
    }
    return prepared
  },

  async pollEnhancedJob(jobId) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < ENHANCED_MAX_WAIT_MS) {
      await this.sleep(ENHANCED_POLL_INTERVAL_MS)
      const job = await request({
        path: `/api/enhance-score-job/${jobId}`,
        method: 'GET'
      })
      if (job.status === 'running') {
        this.setData({ enhancedStatusText: 'AI 正在生成增强分析' })
      }
      if (job.status === 'done') {
        return job.result
      }
      if (job.status === 'failed') {
        return Promise.reject({ detail: job.error || '增强分析生成失败' })
      }
    }
    return Promise.reject({ detail: '增强分析仍在生成中，请稍后重试。' })
  },

  async generateEnhancedReport() {
    if (this.data.enhancedLoading || !this.data.payload || !this.data.report) return
    this.setData({
      enhancedLoading: true,
      enhancedStatusText: '正在整理趋势和补充材料'
    })
    try {
      const materials = await this.prepareEnhancedMaterials()
      this.setData({ enhancedStatusText: '正在提交增强分析请求' })
      const job = await request({
        path: '/api/enhance-score-job',
        method: 'POST',
        data: {
          score_input: this.data.payload,
          base_report: this.data.report,
          history_records: this.data.historyRecords.slice(-6).map((record) => ({
            exam_name: record.examName,
            exam_date: record.examDate,
            total_score: record.totalScore,
            subjects: record.subjects
          })),
          materials
        }
      })
      const enhancedReport = await this.pollEnhancedJob(job.job_id)
      const last = getLastReport()
      setEnhancedReport({
        reportKey: this.getReportKey(last),
        report: enhancedReport
      })
      this.setData({ enhancedReport })
    } catch (error) {
      showError('增强分析失败', error)
      console.error(error)
    } finally {
      this.setData({
        enhancedLoading: false,
        enhancedStatusText: ''
      })
    }
  }
})
