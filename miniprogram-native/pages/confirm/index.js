const { request } = require('../../utils/request')
const { showError } = require('../../utils/error')
const { getScoreDraft, setLastReport } = require('../../utils/storage')

const REPORT_POLL_INTERVAL_MS = 2000
const REPORT_MAX_WAIT_MS = 90000

Page({
  data: {
    draft: {
      student: {},
      exam: {},
      subjects: []
    },
    subjects: [],
    maxSubjects: [],
    totalScore: 0,
    fullScore: 0,
    maxTotalScore: 0,
    hasMaxSubjects: false,
    loading: false,
    reportStatusText: ''
  },

  onShow() {
    const draft = getScoreDraft()
    if (!draft) {
      wx.redirectTo({ url: '/pages/input/index' })
      return
    }
    this.setData({
      draft,
      subjects: draft.subjects || [],
      maxSubjects: draft.max_subjects || [],
      hasMaxSubjects: Boolean(draft.max_subjects && draft.max_subjects.length)
    })
    this.updateTotals()
  },

  onSubjectInput(event) {
    const { index, field } = event.currentTarget.dataset
    const subjects = [...this.data.subjects]
    subjects[index] = {
      ...subjects[index],
      [field]: field === 'name' ? event.detail.value : Number(event.detail.value)
    }
    this.setData({ subjects })
    this.updateTotals()
  },

  updateTotals() {
    const totalScore = this.data.subjects.reduce((sum, item) => sum + (Number(item.score) || 0), 0)
    const fullScore = this.data.subjects.reduce((sum, item) => sum + (Number(item.full_score) || 0), 0)
    const maxTotalScore = this.data.maxSubjects.reduce((sum, item) => sum + (Number(item.score) || 0), 0)
    this.setData({
      totalScore: Math.round(totalScore * 10) / 10,
      fullScore: Math.round(fullScore * 10) / 10,
      maxTotalScore: Math.round(maxTotalScore * 10) / 10
    })
  },

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  },

  async pollReportJob(jobId) {
    const startedAt = Date.now()
    let statusText = 'AI 正在生成报告，请稍候'
    while (Date.now() - startedAt < REPORT_MAX_WAIT_MS) {
      await this.sleep(REPORT_POLL_INTERVAL_MS)
      const job = await request({
        path: `/api/analyze-score-job/${jobId}`,
        method: 'GET'
      })
      if (job.status === 'running' && this.data.reportStatusText !== statusText) {
        this.setData({ reportStatusText: statusText })
      }
      if (job.status === 'done') {
        return job.result
      }
      if (job.status === 'failed') {
        return Promise.reject({ detail: job.error || 'AI 报告生成失败' })
      }
    }
    return Promise.reject({ detail: 'AI 报告仍在生成中，请稍后重试。' })
  },

  async analyze() {
    if (this.data.loading) return
    this.setData({
      loading: true,
      reportStatusText: '正在提交成绩数据'
    })
    try {
      const payload = {
        ...this.data.draft,
        subjects: this.data.subjects,
        max_subjects: this.data.maxSubjects
      }
      const job = await request({
        path: '/api/analyze-score-job',
        method: 'POST',
        data: payload
      })
      this.setData({ reportStatusText: 'AI 正在生成报告，请稍候' })
      const report = await this.pollReportJob(job.job_id)
      setLastReport({ payload, report })
      wx.navigateTo({ url: '/pages/report/index' })
    } catch (error) {
      showError('生成失败', error)
      console.error(error)
    } finally {
      this.setData({
        loading: false,
        reportStatusText: ''
      })
    }
  }
})
