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
    id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    subjectIndex: 0,
    subject: SUBJECTS[0],
    detail: '',
    imagePath: '',
    imageName: ''
  }
}

function createEmptySubjectGroup(subject = SUBJECTS[0]) {
  return {
    id: `group-${subject}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    subject,
    subjectIndex: Math.max(0, SUBJECTS.indexOf(subject)),
    mode: 'image',
    imageEntries: [],
    detail: ''
  }
}

function buildBriefAnalysisDisplay(report) {
  const overview = (report && report.overview) || {}
  const advice = Array.isArray(report && report.learning_advice)
    ? report.learning_advice.slice(0, 3)
    : []

  return {
    averageScore: overview.average_score,
    totalScore: overview.total_score,
    referenceTotalScore: overview.reference_total_score,
    advice
  }
}

function buildMissingSubjectNotice(missingSubjects) {
  const subjects = (missingSubjects || []).map((item) => String(item || '').trim()).filter(Boolean)
  if (!subjects.length) return ''
  return `${subjects.join('、')}科目由于缺少数据，因此无法进行深入分析，其余已导入数据科目开始进行深入分析。`
}

function formatDuration(ms) {
  const safeMs = Math.max(0, Number(ms) || 0)
  const seconds = Math.max(1, Math.round(safeMs / 1000))
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return remain ? `${minutes} 分 ${remain} 秒` : `${minutes} 分钟`
}

function formatElapsedText(ms) {
  if (!ms) return '0 秒'
  return `${formatDuration(ms)}`
}

function buildEnhancedDebugHint(status, elapsedMs, materialCount, uploadCount, error) {
  const elapsedText = formatDuration(elapsedMs)
  if (error) {
    return `服务端返回了错误信息：${error}。系统会继续回退到规则增强报告，避免结果空白。`
  }
  if (status === 'pending') {
    return `任务已排队 ${elapsedText}。常见慢因：材料较多、图片上传尚未结束、云端 AI 正在排队。`
  }
  if (status === 'running' && elapsedMs > 60000) {
    return `已处理 ${elapsedText}。当前有 ${materialCount} 份材料，其中 ${uploadCount} 份是图片；图片越多，上传和识别耗时越长。`
  }
  if (status === 'running') {
    return `正在生成中，已等待 ${elapsedText}。当前共有 ${materialCount} 份补充材料，系统会持续轮询直到完成。`
  }
  return `本次增强分析共耗时 ${elapsedText}，材料数 ${materialCount} 份，其中图片 ${uploadCount} 份。`
}

function buildEnhancedDetailSections(report) {
  if (!report) return {
    subjectInsights: [],
    coreDiagnosis: [],
    subjectGapAnalysis: [],
    strengthBreakthroughs: [],
    executionPlan: [],
    stageGoals: [],
    riskAlerts: [],
    followupMaterials: [],
    parentFocus: '',
    electiveNote: ''
  }

  return {
    subjectInsights: Array.isArray(report.subject_insights) ? report.subject_insights : [],
    coreDiagnosis: Array.isArray(report.core_diagnosis) ? report.core_diagnosis : [],
    subjectGapAnalysis: Array.isArray(report.subject_gap_analysis) ? report.subject_gap_analysis : [],
    strengthBreakthroughs: Array.isArray(report.strength_breakthroughs) ? report.strength_breakthroughs : [],
    executionPlan: Array.isArray(report.execution_plan) ? report.execution_plan : [],
    stageGoals: Array.isArray(report.stage_goals) ? report.stage_goals : [],
    riskAlerts: Array.isArray(report.risk_alerts) ? report.risk_alerts : [],
    followupMaterials: Array.isArray(report.followup_materials) ? report.followup_materials : [],
    parentFocus: report.parent_focus || '',
    electiveNote: report.elective_note || ''
  }
}

function isFinalJobStatus(status) {
  return status === 'done' || status === 'failed'
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

function buildReportExportText({ payload, report, trendSummary, enhancedReport }) {
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
  const enhancedSubjectLines = Array.isArray(enhancedReport && enhancedReport.subject_insights)
    ? enhancedReport.subject_insights.map((item) => {
        const lines = []
        lines.push(`${item.name || '未命名学科'}：${item.diagnosis || ''}`.trim())
        if (item.trend_judgment) lines.push(`趋势：${item.trend_judgment}`)
        if (item.evidence) lines.push(`依据：${item.evidence}`)
        if (item.score_gap_analysis) lines.push(`分差：${item.score_gap_analysis}`)
        if (Array.isArray(item.loss_focus) && item.loss_focus.length) lines.push(`失分重点：${item.loss_focus.join('；')}`)
        if (Array.isArray(item.stable_focus) && item.stable_focus.length) lines.push(`稳定部分：${item.stable_focus.join('；')}`)
        if (Array.isArray(item.source_basis) && item.source_basis.length) lines.push(`来源：${item.source_basis.join('；')}`)
        if (item.action) lines.push(`下一步：${item.action}`)
        if (item.next_target) lines.push(`下次目标：${item.next_target}`)
        return lines.join('；')
      })
    : []
  const enhancedCoreDiagnosis = Array.isArray(enhancedReport && enhancedReport.core_diagnosis)
    ? enhancedReport.core_diagnosis
    : []
  const enhancedSubjectGapAnalysis = Array.isArray(enhancedReport && enhancedReport.subject_gap_analysis)
    ? enhancedReport.subject_gap_analysis
    : []
  const enhancedStrengthBreakthroughs = Array.isArray(enhancedReport && enhancedReport.strength_breakthroughs)
    ? enhancedReport.strength_breakthroughs
    : []
  const enhancedExecutionPlan = Array.isArray(enhancedReport && enhancedReport.execution_plan)
    ? enhancedReport.execution_plan
    : []
  const enhancedStageGoals = Array.isArray(enhancedReport && enhancedReport.stage_goals)
    ? enhancedReport.stage_goals
    : []
  const enhancedRiskAlerts = Array.isArray(enhancedReport && enhancedReport.risk_alerts)
    ? enhancedReport.risk_alerts
    : []
  const enhancedFollowupMaterials = Array.isArray(enhancedReport && enhancedReport.followup_materials)
    ? enhancedReport.followup_materials
    : []
  const enhancedLines = enhancedReport
    ? [
        '',
        'AI增强分析',
        enhancedReport.summary || '',
        '',
        enhancedReport.overall_trend ? `整体趋势：${enhancedReport.overall_trend}` : '',
        '',
        '各科深入分析',
        ...enhancedSubjectLines,
        '',
        '核心诊断',
        ...enhancedCoreDiagnosis,
        '',
        '各科分差分析',
        ...enhancedSubjectGapAnalysis,
        '',
        '优势突破点',
        ...enhancedStrengthBreakthroughs,
        '',
        '执行计划',
        ...enhancedExecutionPlan,
        '',
        '阶段目标',
        ...enhancedStageGoals,
        '',
        '风险提醒',
        ...enhancedRiskAlerts,
        '',
        '建议补充材料',
        ...enhancedFollowupMaterials,
        '',
        enhancedReport.parent_focus ? `家长关注点：${enhancedReport.parent_focus}` : '',
        enhancedReport.elective_note ? `选科补充说明：${enhancedReport.elective_note}` : '',
        enhancedReport.disclaimer ? `说明：${enhancedReport.disclaimer}` : ''
      ]
    : []

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
    '高中选科建议',
    ...electiveLines,
    '',
    '历史趋势',
    ...trendLines,
    '',
    report.disclaimer || '',
    ...enhancedLines
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
    briefAnalysis: null,
    trendExpanded: false,
    city: '杭州',
    educationLink: '',
    materialMode: 'image',
    materialPanelExpanded: true,
    enhancedExplainExpanded: true,
    materialSubjectName: '',
    materialDetail: '',
    materialImagePath: '',
    materialImageName: '',
    pendingMaterials: [],
    previewMaterialId: '',
    enhancedJobId: '',
    enhancedJobStatus: '',
    enhancedJobError: '',
    enhancedJobElapsedMs: 0,
    enhancedJobElapsedText: '0 秒',
    enhancedDebugHint: '',
    enhancedMaterialCount: 0,
    enhancedImageCount: 0,
    enhancedDetail: buildEnhancedDetailSections(null),
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
    const briefAnalysis = report ? buildBriefAnalysisDisplay(report) : null
    this.setData({
      hasReport: Boolean(last && last.report),
      payload: last ? last.payload : null,
      report,
      examSummary,
      historyRecords,
      trendSummary,
      briefAnalysis,
      subjectTrendRows: trendSummary.subjects || [],
      city,
      educationLink: EDUCATION_DEPT_LINKS[city] || '',
      enhancedPurchased: Boolean(enhanced && last && enhanced.reportKey === this.getReportKey(last)),
      strongSubject: getReportSubjectName(report, 'best_subject', ''),
      weakSubject: getReportSubjectName(report, 'weakest_subject', ''),
      enhancedReport: enhanced && last && enhanced.reportKey === this.getReportKey(last) ? enhanced.report : null,
      pendingMaterials: [],
      previewMaterialId: '',
      enhancedJobId: '',
      enhancedJobStatus: '',
      enhancedJobError: '',
      enhancedJobElapsedMs: 0,
      enhancedJobElapsedText: '0 秒',
      enhancedDebugHint: '',
      enhancedMaterialCount: 0,
      enhancedImageCount: 0,
      enhancedDetail: buildEnhancedDetailSections(enhanced && last && enhanced.reportKey === this.getReportKey(last) ? enhanced.report : null)
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

  async exportReportAsImage() {
    if (!this.data.hasReport || this.data.exportingImage) return
    const exportText = buildReportExportText({
      payload: this.data.payload,
      report: this.data.report,
      trendSummary: this.data.trendSummary,
      enhancedReport: this.data.enhancedReport
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
      trendSummary: this.data.trendSummary,
      enhancedReport: this.data.enhancedReport
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

  toggleEnhancedExplainSection() {
    this.setData({
      enhancedExplainExpanded: !this.data.enhancedExplainExpanded
    })
  },

  switchMaterialMode(event) {
    const mode = event.currentTarget.dataset.mode
    this.setData({ materialMode: mode })
  },

  toggleMaterialPanel() {
    this.setData({
      materialPanelExpanded: !this.data.materialPanelExpanded
    })
  },

  onEnhancedSubjectInput(event) {
    const subject = (event.detail.value || '').trim() || SUBJECTS[0]
    this.setData({
      materialSubjectName: subject
    })
  },

  onMaterialDetailInput(event) {
    this.setData({
      materialDetail: event.detail.value
    })
  },

  addSubjectImage() {
    this.addMaterialRow()
  },

  addSubjectTextGroup() {
    this.setData({ materialMode: 'text' })
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

  updateEnhancedDebugState(status, elapsedMs, materialCount, uploadCount, error = '') {
    const enhancedDebugHint = buildEnhancedDebugHint(status, elapsedMs, materialCount, uploadCount, error)
    this.setData({
      enhancedJobStatus: status || '',
      enhancedJobError: error || '',
      enhancedJobElapsedMs: elapsedMs || 0,
      enhancedJobElapsedText: formatElapsedText(elapsedMs),
      enhancedMaterialCount: materialCount || 0,
      enhancedImageCount: uploadCount || 0,
      enhancedDebugHint
    })
  },

  async pollEnhancedJob(jobId, materialCount = 0, uploadCount = 0) {
    const startedAt = Date.now()
    let lastStatus = 'pending'
    while (Date.now() - startedAt < ENHANCED_MAX_WAIT_MS) {
      const response = await request({
        path: `/api/enhance-score-job/${jobId}`,
        method: 'GET'
      })
      const status = response && response.status ? response.status : 'pending'
      lastStatus = status
      const elapsedMs = Date.now() - startedAt
      const error = response && response.error ? response.error : ''
      this.updateEnhancedDebugState(status, elapsedMs, materialCount, uploadCount, error)

      if (status === 'done' && response.result) {
        return response.result
      }
      if (status === 'failed') {
        throw new Error(error || '增强分析任务失败')
      }

      await this.sleep(ENHANCED_POLL_INTERVAL_MS)
    }

    throw new Error(`增强分析超时：已等待 ${formatDuration(Date.now() - startedAt)}，任务状态仍为 ${lastStatus}`)
  },

  chooseMaterialImage(event) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths && res.tempFilePaths[0]
        const file = res.tempFiles && res.tempFiles[0]
        if (!filePath) return
        this.setData({
          materialImagePath: filePath,
          materialImageName: file && file.name ? file.name : filePath.split('\\').pop().split('/').pop(),
          enhancedStatusText: ''
        })
      }
    })
  },

  clearMaterialImage() {
    this.setData({
      materialImagePath: '',
      materialImageName: ''
    })
  },

  buildCurrentMaterialEntry() {
    const subject = (this.data.materialSubjectName || '').trim()
    if (!subject) {
      return { error: '请先填写要分析的学科。' }
    }

    if (this.data.materialMode === 'image') {
      if (!this.data.materialImagePath) {
        return { error: `请先导入${subject}的试卷照片。` }
      }

      return {
        entry: {
          id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          subject,
          mode: 'upload',
          detail: '',
          preview: this.data.materialImagePath,
          imageName: this.data.materialImageName || '',
          filePath: this.data.materialImagePath
        }
      }
    }

    const detail = (this.data.materialDetail || '').trim()
    if (!detail) {
      return { error: `请先输入${subject}各题型得分和丢分情况。` }
    }

    return {
      entry: {
        id: `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        subject,
        mode: 'text',
        detail,
        preview: '',
        imageName: '',
        filePath: ''
      }
    }
  },

  clearCurrentMaterialEntry() {
    this.setData({
      materialSubjectName: '',
      materialDetail: '',
      materialImagePath: '',
      materialImageName: ''
    })
  },

  getMissingEnhancedSubjects(materials = []) {
    const subjectSet = new Set(
      (materials || [])
        .map((item) => String(item && item.subject ? item.subject : '').trim())
        .filter(Boolean)
    )
    const payloadSubjects = Array.isArray(this.data.payload && this.data.payload.subjects)
      ? this.data.payload.subjects
          .map((item) => String(item && item.name ? item.name : '').trim())
          .filter(Boolean)
      : []
    return payloadSubjects.filter((subject) => !subjectSet.has(subject))
  },

  confirmMissingEnhancedSubjects(missingSubjects) {
    const content = buildMissingSubjectNotice(missingSubjects)
    if (!content) return Promise.resolve(true)

    return new Promise((resolve) => {
      wx.showModal({
        title: '缺少学科数据',
        content,
        confirmText: '继续分析',
        cancelText: '继续补充',
        success: (res) => {
          resolve(Boolean(res && res.confirm))
        },
        fail: () => resolve(false)
      })
    })
  },

  addMaterialRow() {
    const { entry, error } = this.buildCurrentMaterialEntry()
    if (error) {
      this.setData({ enhancedStatusText: error })
      return
    }

    const pendingMaterials = [...(this.data.pendingMaterials || []), entry]
    this.setData({
      pendingMaterials,
      previewMaterialId: '',
      materialPanelExpanded: true,
      enhancedStatusText: `已加入${entry.subject}，可以继续导入另一门学科，或点击“开始分析”统一分析。`
    })
    this.clearCurrentMaterialEntry()
  },

  toggleMaterialPreview(event) {
    const entryId = event.currentTarget.dataset.id
    this.setData({
      previewMaterialId: this.data.previewMaterialId === entryId ? '' : entryId
    })
  },

  editMaterialEntry(event) {
    const entryId = event.currentTarget.dataset.id
    const entry = (this.data.pendingMaterials || []).find((item) => item.id === entryId)
    if (!entry) return

    this.setData({
      materialSubjectName: entry.subject || '',
      materialMode: entry.mode === 'upload' ? 'image' : 'text',
      materialDetail: entry.detail || '',
      materialImagePath: entry.preview || '',
      materialImageName: entry.imageName || '',
      pendingMaterials: (this.data.pendingMaterials || []).filter((item) => item.id !== entryId),
      previewMaterialId: '',
      materialPanelExpanded: true,
      enhancedStatusText: `正在修改${entry.subject}，调整后可重新添加。`
    })
  },

  async prepareEnhancedMaterials(entries = []) {
    const prepared = []
    const groups = entries || []
    let processedCount = 0
    const totalImages = groups.filter((entry) => entry.mode === 'upload' && entry.filePath).length
    for (const entry of groups) {
      const subject = entry.subject || SUBJECTS[0]
      if (entry.mode === 'upload' && entry.filePath) {
        this.setEnhancedProgress(1, `正在上传补充材料 ${processedCount + 1}/${Math.max(1, totalImages)}`)
        const uploaded = await uploadFileForUrl({
          filePath: entry.filePath,
          type: subject,
          folder: 'enhanced-materials'
        })
        prepared.push({
          subject,
          input_type: 'image',
          detail: '',
          image_url: uploaded.fileUrl,
          image_name: entry.imageName || ''
        })
        processedCount += 1
        continue
      }

      const detail = (entry.detail || '').trim()
      if (detail) {
        prepared.push({
          subject,
          input_type: 'text',
          detail,
          image_url: '',
          image_name: ''
        })
      }
    }
    return prepared
  },

  buildMaterialEntryFromCurrent() {
    return this.buildCurrentMaterialEntry()
  },

  async generateEnhancedReport() {
    if (this.data.enhancedLoading || !this.data.payload || !this.data.report) return

    const pendingMaterials = [...(this.data.pendingMaterials || [])]
    const hasCurrentInput = Boolean(
      (this.data.materialSubjectName || '').trim() ||
        (this.data.materialDetail || '').trim() ||
        this.data.materialImagePath
    )
    if (hasCurrentInput) {
      const { entry, error } = this.buildCurrentMaterialEntry()
      if (error) {
        this.setData({ enhancedStatusText: error })
        return
      }
      pendingMaterials.push(entry)
      this.setData({
        pendingMaterials,
        previewMaterialId: '',
        materialSubjectName: '',
        materialDetail: '',
        materialImagePath: '',
        materialImageName: ''
      })
    }

    if (pendingMaterials.length === 0) {
      this.setData({ enhancedStatusText: '请先至少加入一门学科后再开始分析。' })
      return
    }

    const missingSubjects = this.getMissingEnhancedSubjects(pendingMaterials)
    if (missingSubjects.length) {
      const shouldContinue = await this.confirmMissingEnhancedSubjects(missingSubjects)
      if (!shouldContinue) {
        this.setData({
          enhancedStatusText: '已取消开始分析，请继续补充缺少数据的科目后再分析。'
        })
        return
      }
      this.setData({
        enhancedStatusText: buildMissingSubjectNotice(missingSubjects)
      })
    }

    this.setData({
      enhancedLoading: true,
      enhancedProgressTitle: '正在生成增强分析',
      enhancedProgressStep: 0,
      enhancedStatusText: '正在整理趋势和补充材料',
      enhancedJobId: '',
      enhancedJobStatus: '',
      enhancedJobError: '',
      enhancedJobElapsedMs: 0,
      enhancedJobElapsedText: '0 秒',
      enhancedDebugHint: '',
      enhancedMaterialCount: pendingMaterials.length,
      enhancedImageCount: pendingMaterials.filter((item) => item.mode === 'upload').length
    })
    try {
      this.setEnhancedProgress(0, '正在整理趋势和补充材料')
      const materials = await this.prepareEnhancedMaterials(pendingMaterials)
      this.updateEnhancedDebugState('preparing', 0, pendingMaterials.length, pendingMaterials.filter((item) => item.mode === 'upload').length)
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
      this.updateEnhancedDebugState('queued', 0, pendingMaterials.length, pendingMaterials.filter((item) => item.mode === 'upload').length)
      this.setEnhancedProgress(2, '任务已提交，正在连接 AI 大模型')
      this.setData({
        enhancedJobId: job.job_id
      })
      const enhancedReport = await this.pollEnhancedJob(
        job.job_id,
        pendingMaterials.length,
        pendingMaterials.filter((item) => item.mode === 'upload').length
      )
      const last = getLastReport()
      setEnhancedReport({
        reportKey: this.getReportKey(last),
        report: enhancedReport
      })
      this.setData({
        enhancedReport,
        enhancedDetail: buildEnhancedDetailSections(enhancedReport),
        enhancedJobStatus: 'done',
        enhancedDebugHint: buildEnhancedDebugHint('done', this.data.enhancedJobElapsedMs || 0, pendingMaterials.length, pendingMaterials.filter((item) => item.mode === 'upload').length)
      })
    } catch (error) {
      if (this._pageAlive !== false) {
        this.setEnhancedProgress(3, '增强分析生成较慢，系统已自动重试。您可以稍后继续查看，已上传材料不会丢失。')
      }
      this.updateEnhancedDebugState('failed', this.data.enhancedJobElapsedMs || 0, pendingMaterials.length, pendingMaterials.filter((item) => item.mode === 'upload').length, error && error.message ? error.message : String(error))
      console.error(error)
      if (!this.data.enhancedReport && this.data.report) {
        const fallback = buildEnhancedDetailSections({
          subject_insights: [],
          core_diagnosis: [
            '当前任务未成功返回完整增强分析，但系统已根据现有成绩与补充材料整理了基础深度结论。',
            '如果是图片上传较慢，通常是素材较大或网络较慢；如果是服务端错误，系统会继续沿用规则兜底内容。'
          ],
          subject_gap_analysis: [],
          strength_breakthroughs: [
            '先稳住当前优势科目，保持原有训练节奏，避免优势回落。',
            '把最弱学科拆成题型级别来补，不再只看总分。'
          ],
          execution_plan: [
            '优先复盘当前输入科目的题型与模块，先找失分最集中的部分。',
            '接下来 7 天每天安排 20 到 30 分钟的定向训练，并记录错因。',
            '补充一张更清晰的试卷或模块截图，AI 会更容易定位具体失分点。'
          ],
          stage_goals: [
            '下一次考试先验证当前补救动作是否生效。',
            '先让最弱科目的基础题稳定，再追求中档题提分。'
          ],
          risk_alerts: [
            '材料太少时，AI 只能给出方向性结论，不能替代试卷讲评。',
            '只看单次成绩很容易误判，建议至少连续观察 2 到 3 次。'
          ],
          followup_materials: [
            '补充更清晰的试卷照片，尤其是题型标题和模块得分。',
            '如果是文字输入，尽量写出“题型-满分-得分-失分原因”。'
          ],
          parent_focus: '家长可以先盯住一个最弱模块，帮助孩子把错因写清楚，而不是一次盯所有科目。',
          elective_note: this.data.report.elective_note || ''
        })
        this.setData({
          enhancedReport: {
            summary: 'AI增强分析已完成基础兜底，建议继续补充更清晰材料后再次生成。',
            overall_trend: '',
            subject_insights: [],
            core_diagnosis: fallback.coreDiagnosis,
            subject_gap_analysis: fallback.subjectGapAnalysis,
            strength_breakthroughs: fallback.strengthBreakthroughs,
            execution_plan: fallback.executionPlan,
            stage_goals: fallback.stageGoals,
            risk_alerts: fallback.riskAlerts,
            followup_materials: fallback.followupMaterials,
            parent_focus: fallback.parentFocus,
            elective_note: fallback.electiveNote,
            disclaimer: '增强分析基于当前成绩和已上传材料生成，不能替代试卷讲评、学校政策和教师判断。'
          },
          enhancedDetail: fallback
        })
        this.setEnhancedProgress(4, '已切换到规则兜底分析，当前结果可继续查看。')
      }
    } finally {
      this.setData({
        enhancedLoading: false
      })
    }
  }
})
