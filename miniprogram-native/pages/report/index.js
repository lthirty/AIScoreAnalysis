const { request } = require('../../utils/request')
const { showError } = require('../../utils/error')
const { SUBJECTS, EDUCATION_DEPT_LINKS } = require('../../utils/constants')
const { uploadFileForUrl } = require('../../utils/upload')
const { getEnhancedReport, getHistoryRecords, getLastReport, getPreferences, setEnhancedReport } = require('../../utils/storage')
const { buildTrendSummary } = require('../../utils/trend')
const { drawLineChart } = require('../../utils/trendCanvas')
const { VERSION_LABEL } = require('../../utils/version')

const ENHANCED_POLL_INTERVAL_MS = 2500
const ENHANCED_MAX_WAIT_MS = 900000

function createEmptyMaterial() {
  return {
    subjectIndex: 0,
    subject: SUBJECTS[0],
    detail: '',
    imagePath: '',
    imageName: ''
  }
}

function getReportSubjectName(report, key, fallback) {
  return report && report.overview && report.overview[key] ? report.overview[key] : fallback
}

function joinLines(lines) {
  return lines
    .map((line) => (line === undefined || line === null ? '' : String(line)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildReportExportText({ payload, report, trendSummary }) {
  if (!report || !payload) return ''

  const exam = payload.exam || {}
  const overview = report.overview || {}
  const comparisonLines = (report.subject_comparison || []).map((item) => {
    const ownScore = item.score != null ? item.score : '-'
    const referenceScore = item.reference_score != null ? item.reference_score : '-'
    const gap = item.gap_to_reference != null ? `${item.gap_to_reference}` : '-'
    return `${item.name}：自己${ownScore}，参考${referenceScore}，分差${gap}，满分${item.full_score || '-'}`
  })
  const strengthLines = (report.strengths || []).map((item) => `${item.name}：${item.evidence}`)
  const weaknessLines = (report.weaknesses || []).map((item) => `${item.name}：${item.evidence}`)
  const adviceLines = (report.learning_advice || []).map((item, index) => `${index + 1}、${item}`)
  const electivePlan = report.elective_plan || {}
  const electiveLines = electivePlan.recommendation
    ? [
        `直接建议：${electivePlan.recommendation}`,
        electivePlan.basis ? `推荐依据：${electivePlan.basis}` : '',
        (electivePlan.alternatives || []).length > 0
          ? `其他备选：${electivePlan.alternatives.map((item) => `${item.combo}（${item.reason}）`).join('；')}`
          : '',
        (electivePlan.actions || []).length > 0
          ? `下一步验证：${electivePlan.actions.map((item, index) => `${index + 1}、${item}`).join('；')}`
          : '',
        electivePlan.note ? `备注：${electivePlan.note}` : ''
      ]
    : []
  const trendLines = trendSummary && trendSummary.summary ? [trendSummary.summary] : []

  return joinLines([
    'AI分析报告',
    [(payload.student && payload.student.city) || '', (payload.student && payload.student.grade) || '', [exam.date, exam.name].filter(Boolean).join(' · ')]
      .filter(Boolean)
      .join(' · '),
    '',
    report.summary || '',
    '',
    `平均分：${overview.average_score || 0}  个人总分：${overview.total_score || 0}  参考总分：${overview.reference_total_score || '-'}`,
    '',
    '本次考试各科成绩对比',
    ...comparisonLines,
    '',
    '优势科目',
    ...strengthLines,
    '',
    '薄弱科目',
    ...weaknessLines,
    '',
    '学习建议',
    ...adviceLines,
    '',
    '家长建议',
    report.parent_advice || '',
    '',
    '高中选科建议',
    ...electiveLines,
    '',
    '历史趋势',
    ...trendLines,
    '',
    report.disclaimer || ''
  ])
}

function decodeBase64ToArrayBuffer(base64) {
  if (typeof wx.base64ToArrayBuffer === 'function') {
    return wx.base64ToArrayBuffer(base64)
  }

  const binary = typeof atob === 'function' ? atob(base64) : ''
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function wrapTextLines(ctx, text, maxWidth) {
  const lines = []
  String(text || '').split('\n').forEach((paragraph) => {
    if (!paragraph.trim()) {
      lines.push('')
      return
    }

    let line = ''
    Array.from(paragraph).forEach((char) => {
      const next = `${line}${char}`
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = next
      }
    })
    if (line) lines.push(line)
  })
  return lines
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
    enhancedPurchased: false,
    strongSubject: '',
    weakSubject: '',
    enhancedReport: null,
    enhancedLoading: false,
    enhancedStatusText: '',
    enhancedProgressTitle: '正在生成增强分析',
    enhancedProgressStep: 0,
    enhancedProgressSteps: [
      '整理题型与趋势材料',
      '上传补充数据',
      '连接 AI 大模型',
      'AI 处理中',
      '结果回传并生成增强报告'
    ],
    exportingImage: false,
    exportingPdf: false,
    versionLabel: VERSION_LABEL
  },

  onShow() {
    this._pageAlive = true
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
      enhancedPurchased: Boolean(enhanced && last && enhanced.reportKey === this.getReportKey(last)),
      strongSubject: getReportSubjectName(report, 'best_subject', ''),
      weakSubject: getReportSubjectName(report, 'weakest_subject', ''),
      enhancedReport: enhanced && last && enhanced.reportKey === this.getReportKey(last) ? enhanced.report : null
    })
    if (historyRecords.length > 0 && this.data.trendExpanded) {
      wx.nextTick(() => this.renderTrendCharts())
    }
  },

  onUnload() {
    this._pageAlive = false
  },

  goInput() {
    wx.navigateTo({ url: '/pages/input/index' })
  },

  purchaseEnhanced() {
    this.setData({ enhancedPurchased: true })
    wx.showToast({
      title: '已解锁增强分析',
      icon: 'success'
    })
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

  async exportReportAsImage() {
    if (!this.data.hasReport || this.data.exportingImage) return
    const exportText = buildReportExportText({
      payload: this.data.payload,
      report: this.data.report,
      trendSummary: this.data.trendSummary
    })
    if (!exportText) {
      wx.showToast({
        title: '没有可导出的内容',
        icon: 'none'
      })
      return
    }

    this.setData({ exportingImage: true })
    try {
      const lines = wrapTextLines({
        measureText(text) {
          return { width: String(text || '').length * 18 }
        }
      }, exportText, 900)
      const query = wx.createSelectorQuery()
      query.select('#reportExportCanvas').fields({ node: true, size: true }).exec((res) => {
        const target = res && res[0]
        if (!target || !target.node) {
          this.setData({ exportingImage: false })
          wx.showToast({ title: '导出画布不可用', icon: 'none' })
          return
        }

        const canvas = target.node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio || 2 : 2
        const width = 1080
        const padding = 64
        const lineHeight = 42
        const height = Math.max(1400, padding * 2 + lines.length * lineHeight)

        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = '#111827'
        ctx.font = '30px sans-serif'
        ctx.textBaseline = 'top'

        lines.forEach((line, index) => {
          ctx.fillText(line, padding, padding + index * lineHeight)
        })

        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'png',
            quality: 1,
            success: (result) => {
              wx.saveImageToPhotosAlbum({
                filePath: result.tempFilePath,
                success: () => {
                  wx.showToast({ title: '图片已保存', icon: 'success' })
                },
                fail: () => {
                  wx.previewImage({ urls: [result.tempFilePath] })
                }
              })
            },
            fail: (error) => {
              showError('图片导出失败', error)
            },
            complete: () => {
              this.setData({ exportingImage: false })
            }
          }, this)
        }, 50)
      })
    } catch (error) {
      this.setData({ exportingImage: false })
      showError('图片导出失败', error)
    }
  },

  async exportReportAsPdf() {
    if (!this.data.hasReport || this.data.exportingPdf) return
    const exportText = buildReportExportText({
      payload: this.data.payload,
      report: this.data.report,
      trendSummary: this.data.trendSummary
    })
    if (!exportText) {
      wx.showToast({
        title: '没有可导出的内容',
        icon: 'none'
      })
      return
    }

    this.setData({ exportingPdf: true })
    try {
      const result = await request({
        path: '/api/export-report-pdf',
        method: 'POST',
        data: {
          title: 'AI分析报告',
          content: exportText,
          filename: `AI分析报告-${new Date().toISOString().slice(0, 10)}.pdf`
        }
      })
      const base64 = result.pdf_base64 || ''
      if (!base64) {
        throw new Error('PDF导出失败：没有返回文件内容')
      }
      const filePath = `${wx.env.USER_DATA_PATH}/AI分析报告-${Date.now()}.pdf`
      const fs = wx.getFileSystemManager()
      fs.writeFile({
        filePath,
        data: decodeBase64ToArrayBuffer(base64),
        success: () => {
          wx.openDocument({
            filePath,
            fileType: 'pdf',
            success: () => {
              wx.showToast({ title: 'PDF已打开', icon: 'success' })
            },
            fail: (error) => {
              showError('PDF打开失败', error)
            }
          })
        },
        fail: (error) => {
          showError('PDF保存失败', error)
        },
        complete: () => {
          this.setData({ exportingPdf: false })
        }
      })
    } catch (error) {
      this.setData({ exportingPdf: false })
      showError('PDF导出失败', error)
    }
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

  setEnhancedProgress(step, text, title) {
    const nextPatch = {}
    if (typeof step === 'number' && this.data.enhancedProgressStep !== step) {
      nextPatch.enhancedProgressStep = step
    }
    if (text && this.data.enhancedStatusText !== text) {
      nextPatch.enhancedStatusText = text
    }
    if (title && this.data.enhancedProgressTitle !== title) {
      nextPatch.enhancedProgressTitle = title
    }
    if (Object.keys(nextPatch).length) {
      this.setData(nextPatch)
    }
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
    const totalEntries = this.data.materialEntries.length
    let processedCount = 0
    for (const entry of this.data.materialEntries) {
      const hasDetail = Boolean((entry.detail || '').trim())
      const hasImage = Boolean(entry.imagePath)
      if (!hasDetail && !hasImage) continue
      let imageUrl = ''
      if (hasImage) {
        this.setEnhancedProgress(1, `正在上传补充材料 ${processedCount + 1}/${Math.max(1, totalEntries)}`)
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
      processedCount += 1
    }
    return prepared
  },

  async pollEnhancedJob(jobId) {
    const startedAt = Date.now()
    let transientErrors = 0
    while (this._pageAlive !== false) {
      const elapsed = Date.now() - startedAt
      this.setEnhancedProgress(
        3,
        elapsed < 90000
          ? 'AI 正在分析题型得分、历史趋势和补充材料'
          : elapsed < 240000
            ? '增强分析仍在生成，系统正在持续等待'
            : '云端分析较慢，系统仍在继续生成，请保持当前页面'
      )
      await this.sleep(ENHANCED_POLL_INTERVAL_MS)
      let job = null
      try {
        job = await request({
          path: `/api/enhance-score-job/${jobId}`,
          method: 'GET'
        })
        transientErrors = 0
      } catch (error) {
        if (this.isTransientCloudError(error) && transientErrors < 40) {
          transientErrors += 1
          this.setEnhancedProgress(3, 'AI 处理中，正在继续等待云端结果')
          continue
        }
        if (elapsed < ENHANCED_MAX_WAIT_MS) {
          this.setEnhancedProgress(3, '请求较慢，正在自动重试增强分析')
          continue
        }
        throw error
      }
      if (job.status === 'done') {
        this.setEnhancedProgress(4, '增强分析已经生成，正在回传结果')
        return job.result
      }
      if (job.status === 'failed') {
        if (this.isTransientCloudError(job) && elapsed < ENHANCED_MAX_WAIT_MS) {
          this.setEnhancedProgress(3, '云端正在重新整理增强分析，请继续等待')
          continue
        }
        throw { detail: job.error || '增强分析生成失败' }
      }
    }
    throw { detail: '页面已关闭，停止等待增强分析。' }
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

  async generateEnhancedReport() {
    if (this.data.enhancedLoading || !this.data.payload || !this.data.report) return
    this.setData({
      enhancedLoading: true,
      enhancedProgressTitle: '正在生成增强分析',
      enhancedProgressStep: 0,
      enhancedStatusText: '正在整理趋势和补充材料'
    })
    try {
      this.setEnhancedProgress(0, '正在整理趋势和补充材料')
      const materials = await this.prepareEnhancedMaterials()
      this.setEnhancedProgress(1, '补充材料已准备完成，正在提交增强分析请求')
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
      this.setEnhancedProgress(2, '任务已提交，正在连接 AI 大模型')
      const enhancedReport = await this.pollEnhancedJob(job.job_id)
      const last = getLastReport()
      setEnhancedReport({
        reportKey: this.getReportKey(last),
        report: enhancedReport
      })
      this.setData({ enhancedReport })
    } catch (error) {
      if (this._pageAlive !== false) {
        this.setEnhancedProgress(3, '增强分析生成较慢，系统已自动重试。您可以稍后继续查看，已上传材料不会丢失。')
      }
      console.error(error)
    } finally {
      this.setData({
        enhancedLoading: false
      })
    }
  }
})
