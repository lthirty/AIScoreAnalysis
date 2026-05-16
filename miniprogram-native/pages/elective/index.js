const { getLastReport } = require('../../utils/storage')
const { VERSION_LABEL } = require('../../utils/version')

function buildElectiveDisplay(report) {
  const plan = report && report.elective_plan ? report.elective_plan : {}
  const alternatives = Array.isArray(plan.alternatives) ? plan.alternatives : []
  return {
    recommendation: plan.recommendation || '',
    basis: plan.basis || report.elective_advice || '',
    alternatives,
    actions: Array.isArray(plan.actions) ? plan.actions : [],
    note: plan.note || '',
    summary: report.summary || ''
  }
}

Page({
  data: {
    hasPlan: false,
    examSummary: '',
    elective: null,
    versionLabel: VERSION_LABEL
  },

  onShow() {
    const last = getLastReport()
    const report = last ? last.report : null
    const elective = report ? buildElectiveDisplay(report) : null
    const exam = last && last.payload ? last.payload.exam || {} : {}
    const examSummary = [exam.date, exam.name].filter(Boolean).join(' · ')
    this.setData({
      hasPlan: Boolean(elective && elective.recommendation),
      examSummary,
      elective
    })
  },

  goReport() {
    wx.navigateTo({
      url: '/pages/report/index'
    })
  },

  goInput() {
    wx.navigateTo({
      url: '/pages/input/index'
    })
  }
})
