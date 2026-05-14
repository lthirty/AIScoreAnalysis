const { getLastReport } = require('../../utils/storage')

Page({
  data: {
    hasReport: false,
    payload: null,
    report: null,
    planRows: []
  },

  onShow() {
    const last = getLastReport()
    const report = last ? last.report : null
    const planRows = report && Array.isArray(report.two_week_plan)
      ? report.two_week_plan.map((text, index) => ({ number: index + 1, text }))
      : []
    this.setData({
      hasReport: Boolean(last && last.report),
      payload: last ? last.payload : null,
      report,
      planRows
    })
  },

  goInput() {
    wx.navigateTo({ url: '/pages/input/index' })
  }
})
