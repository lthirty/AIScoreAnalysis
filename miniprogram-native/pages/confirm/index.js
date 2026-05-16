const { request } = require('../../utils/request')
const { appendHistoryRecord, getHistoryRecords, getScoreDraft, setHistoryRecords, setLastReport } = require('../../utils/storage')
const { calculateTotalScore } = require('../../utils/trend')
const { VERSION_LABEL } = require('../../utils/version')

const REPORT_POLL_INTERVAL_MS = 2500
const REPORT_MAX_WAIT_MS = 900000
const REPORT_POLL_RETRY_LIMIT = 40
const REPORT_CREATE_RETRY_LIMIT = 12

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
    reportStatusText: '',
    statusNote: '',
    examSummary: '',
    versionLabel: VERSION_LABEL,
    reportProgressTitle: '正在生成 AI 报告',
    reportProgressStep: 0,
    reportProgressSteps: [
      '整理成绩数据',
      '提交分析任务',
      '连接 AI 大模型',
      'AI 处理中',
      '结果回传并生成报告'
    ]
  },

  onShow() {
    this._pageAlive = true
    const draft = getScoreDraft()
    if (!draft) {
      wx.redirectTo({ url: '/pages/input/index' })
      return
    }
    const examSummary = [
      draft.student && draft.student.city,
      draft.student && draft.student.grade,
      draft.exam && draft.exam.date,
      draft.exam && draft.exam.name
    ].filter(Boolean).join(' · ')
    this.setData({
      draft,
      subjects: draft.subjects || [],
      maxSubjects: draft.max_subjects || [],
      hasMaxSubjects: Boolean(draft.max_subjects && draft.max_subjects.length),
      examSummary
    })
    this.updateTotals()
  },

  onUnload() {
    this._pageAlive = false
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

  setReportProgress(step, text, title) {
    const nextPatch = {}
    if (typeof step === 'number' && this.data.reportProgressStep !== step) {
      nextPatch.reportProgressStep = step
    }
    if (text && this.data.reportStatusText !== text) {
      nextPatch.reportStatusText = text
    }
    if (title && this.data.reportProgressTitle !== title) {
      nextPatch.reportProgressTitle = title
    }
    if (Object.keys(nextPatch).length) {
      this.setData(nextPatch)
    }
  },

  async pollReportJob(jobId) {
    const startedAt = Date.now()
    let transientErrors = 0
    while (this._pageAlive !== false) {
      const elapsed = Date.now() - startedAt
      const statusText = elapsed < 90000
        ? 'AI 正在分析成绩结构并生成建议'
        : elapsed < 240000
          ? 'AI 报告仍在生成，系统正在持续等待'
          : '云端分析较慢，系统仍在继续生成，请保持当前页面'
      this.setReportProgress(3, statusText)
      await this.sleep(REPORT_POLL_INTERVAL_MS)
      let job = null
      try {
        job = await request({
          path: `/api/analyze-score-job/${jobId}`,
          method: 'GET'
        })
        transientErrors = 0
      } catch (error) {
        if (this.isTransientCloudError(error) && transientErrors < REPORT_POLL_RETRY_LIMIT) {
          transientErrors += 1
          this.setReportProgress(3, 'AI 处理中，正在继续等待云端结果')
          continue
        }
        if (elapsed < REPORT_MAX_WAIT_MS) {
          this.setReportProgress(3, '请求较慢，正在自动重试并继续等待')
          continue
        }
        throw error
      }
      if (job.status === 'done') {
        this.setReportProgress(4, '报告已经生成，正在回传结果')
        return job.result
      }
      if (job.status === 'failed') {
        if (this.isTransientCloudError(job) && elapsed < REPORT_MAX_WAIT_MS) {
          this.setReportProgress(3, '云端正在重新整理报告，请继续等待')
          continue
        }
        throw { detail: job.error || 'AI 报告生成失败' }
      }
    }
    throw { detail: '页面已关闭，停止等待报告。' }
  },

  async waitForReport(jobId) {
    let transientErrors = 0
    while (this._pageAlive !== false) {
      try {
        return await this.pollReportJob(jobId)
      } catch (error) {
        if (!this.isTransientCloudError(error) || transientErrors >= REPORT_POLL_RETRY_LIMIT) {
          throw error
        }
        transientErrors += 1
        this.setReportProgress(3, '云端连接不稳定，正在继续等待报告')
        await this.sleep(Math.min(4000, 1200 * transientErrors))
      }
    }
    throw { detail: '页面已关闭，停止等待报告。' }
  },

  async createReportJob(payload) {
    let attempts = 0
    while (this._pageAlive !== false && attempts <= REPORT_CREATE_RETRY_LIMIT) {
      try {
        return await request({
          path: '/api/analyze-score-job',
          method: 'POST',
          data: payload
        })
      } catch (error) {
        if (!this.isTransientCloudError(error) || attempts >= REPORT_CREATE_RETRY_LIMIT) {
          throw error
        }
        attempts += 1
        this.setReportProgress(1, '云端连接较慢，正在重新提交报告任务')
        await this.sleep(Math.min(5000, 1200 * attempts))
      }
    }
    return Promise.reject({ detail: '报告任务提交失败，请稍后重试。' })
  },

  isTransientCloudError(error) {
    const message = [
      error && error.errMsg,
      error && error.message,
      error && error.detail,
      error && error.data && error.data.detail,
      error && error.error
    ].filter(Boolean).join(' ')
    return message.includes('102002')
      || message.includes('请求超时')
      || message.includes('system error')
      || message.includes('503')
      || message.includes('502')
      || message.includes('504')
      || message.includes('service unavailable')
      || message.includes('bad gateway')
  },

  saveHistoryRecordWithConflictPrompt(record) {
    const sameDateRecords = getHistoryRecords().filter((item) => item.examDate === record.examDate && record.examDate)
    if (!sameDateRecords.length) {
      appendHistoryRecord(record)
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      wx.showModal({
        title: '发现同日期成绩',
        content: `${record.examDate} 已有成绩记录。是否使用新成绩覆盖旧记录？取消则保留旧记录，不保存本次记录。`,
        confirmText: '覆盖旧记录',
        cancelText: '保留旧记录',
        success: (res) => {
          if (res && res.confirm) {
            const nextRecords = [...getHistoryRecords().filter((item) => item.examDate !== record.examDate), {
              ...record,
              createdAt: new Date().toISOString()
            }]
              .sort((a, b) => new Date(a.examDate || a.createdAt || 0).getTime() - new Date(b.examDate || b.createdAt || 0).getTime())
              .slice(-30)
            setHistoryRecords(nextRecords)
          }
          resolve()
        },
        fail: () => {
          resolve()
        }
      })
    })
  },

  async analyze() {
    if (this.data.loading) return
    this.setData({
      loading: true,
      reportProgressTitle: '正在生成 AI 报告',
      reportProgressStep: 0,
      reportStatusText: '正在整理成绩数据',
      statusNote: ''
    })
    try {
      const payload = {
        ...this.data.draft,
        subjects: this.data.subjects,
        max_subjects: this.data.maxSubjects
      }
      this.setReportProgress(1, '正在提交分析任务')
      const job = await this.createReportJob(payload)
      this.setReportProgress(2, '任务已提交，正在连接 AI 大模型')
      const report = await this.waitForReport(job.job_id)
      setLastReport({ payload, report })
      const nextHistoryRecord = {
        id: `${payload.exam.date || payload.exam.name || Date.now()}-${Date.now()}`,
        city: payload.student.city,
        grade: payload.student.grade,
        examName: payload.exam.name,
        examDate: payload.exam.date,
        totalScore: calculateTotalScore(payload.subjects),
        subjects: payload.subjects,
        createdAt: new Date().toISOString()
      }
      await this.saveHistoryRecordWithConflictPrompt(nextHistoryRecord)
      wx.navigateTo({ url: '/pages/report/index' })
    } catch (error) {
      if (this._pageAlive !== false) {
        this.setData({
          statusNote: 'AI 报告生成较慢，系统已自动重试。您可以再次点击“生成 AI 报告”继续等待，不需要重新录入成绩。'
        })
      }
      console.error(error)
    } finally {
      this.setData({
        loading: false,
        reportStatusText: ''
      })
    }
  }
})
