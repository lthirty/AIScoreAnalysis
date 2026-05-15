const { SUBJECTS } = require('../../utils/constants')

Page({
  data: {
    explainExpanded: false,
    subjectName: '',
    imagePath: '',
    manualDetail: '',
    showManualInput: false,
    subjectOptions: SUBJECTS
  },

  toggleExplainSection() {
    this.setData({ explainExpanded: !this.data.explainExpanded })
  },

  onSubjectInput(event) {
    this.setData({ subjectName: event.detail.value })
  },

  onManualDetailInput(event) {
    this.setData({ manualDetail: event.detail.value })
  },

  showManualInput() {
    this.setData({ showManualInput: true })
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths && res.tempFilePaths[0]
        if (filePath) {
          this.setData({ imagePath: filePath })
        }
      }
    })
  },

  removeImage() {
    this.setData({ imagePath: '' })
  },

  addAnotherSubject() {
    if (!this.data.subjectName.trim()) {
      wx.showToast({ title: '请先输入学科名称', icon: 'none' })
      return
    }
    const subject = this.data.subjectName.trim()
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage && prevPage.addTrendSubject) {
      prevPage.addTrendSubject({
        subject,
        imagePath: this.data.imagePath,
        manualDetail: this.data.manualDetail
      })
    }
    wx.navigateBack()
  },

  startAnalysis() {
    if (!this.data.subjectName.trim()) {
      wx.showToast({ title: '请先输入学科名称', icon: 'none' })
      return
    }
    const subject = this.data.subjectName.trim()
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage && prevPage.addTrendSubject) {
      prevPage.addTrendSubject({
        subject,
        imagePath: this.data.imagePath,
        manualDetail: this.data.manualDetail,
        isLast: true
      })
    }
    wx.navigateBack()
  }
})