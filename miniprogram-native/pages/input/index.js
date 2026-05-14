const { request } = require('../../utils/request')
const { uploadScoreImage } = require('../../utils/upload')
const { showError } = require('../../utils/error')
const { setScoreDraft } = require('../../utils/storage')

Page({
  data: {
    mode: 'text',
    textModeClass: 'active',
    imageModeClass: '',
    showTextMode: true,
    showImageMode: false,
    city: '杭州',
    grade: '高一',
    examName: '期中考试',
    text: '高一期中考试，数学108分，英语126分，物理78分，化学82分',
    myImage: {},
    maxImage: {},
    myImageClass: '',
    maxImageClass: '',
    loading: false,
    ocrLoading: false
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    this.setData({
      mode,
      textModeClass: mode === 'text' ? 'active' : '',
      imageModeClass: mode === 'image' ? 'active' : '',
      showTextMode: mode === 'text',
      showImageMode: mode === 'image'
    })
  },

  onCityInput(event) {
    this.setData({ city: event.detail.value })
  },

  onGradeInput(event) {
    this.setData({ grade: event.detail.value })
  },

  onExamInput(event) {
    this.setData({ examName: event.detail.value })
  },

  onTextInput(event) {
    this.setData({ text: event.detail.value })
  },

  chooseImage(event) {
    const type = event.currentTarget.dataset.type
    wx.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths && res.tempFilePaths[0]
        const file = res.tempFiles && res.tempFiles[0]
        if (!filePath) return
        if (type === 'my') {
          this.setData({
            myImage: { path: filePath, size: file ? file.size : 0 },
            myImageClass: 'has-image'
          })
          return
        }
        this.setData({
          maxImage: { path: filePath, size: file ? file.size : 0 },
          maxImageClass: 'has-image'
        })
      }
    })
  },

  removeImage(event) {
    const type = event.currentTarget.dataset.type
    if (type === 'my') {
      this.setData({ myImage: {}, myImageClass: '' })
      return
    }
    this.setData({ maxImage: {}, maxImageClass: '' })
  },

  async recognizeImages() {
    if (!this.data.myImage.path) {
      wx.showToast({ title: '请先导入个人成绩', icon: 'none' })
      return
    }

    this.setData({ ocrLoading: true })
    wx.showLoading({ title: '识别中' })
    try {
      const myResult = await uploadScoreImage({
        filePath: this.data.myImage.path,
        type: 'my'
      })
      let maxResult = null
      if (this.data.maxImage.path) {
        maxResult = await uploadScoreImage({
          filePath: this.data.maxImage.path,
          type: 'max'
        })
      }

      const myScore = myResult.structured_score || {}
      const maxScore = maxResult ? (maxResult.structured_score || {}) : {}
      const draft = {
        student: {
          city: this.data.city,
          grade: this.data.grade
        },
        exam: {
          name: this.data.examName,
          date: new Date().toISOString().slice(0, 10)
        },
        subjects: myScore.subjects || [],
        max_subjects: maxScore.subjects || [],
        ocr: {
          my_raw_text: myResult.raw_text || '',
          max_raw_text: maxResult ? (maxResult.raw_text || '') : '',
          warnings: [
            ...(myResult.warnings || []),
            ...((maxResult && maxResult.warnings) || [])
          ]
        }
      }

      if (!draft.subjects.length) {
        showError('未识别到成绩', {
          detail: '图片已上传，但没有识别出有效科目成绩。请换一张更清晰的成绩截图，或先使用文字录入。'
        })
        return
      }
      setScoreDraft(draft)
      wx.navigateTo({ url: '/pages/confirm/index' })
    } catch (error) {
      showError('识别失败', error)
      console.error(error)
    } finally {
      wx.hideLoading()
      this.setData({ ocrLoading: false })
    }
  },

  async parseScore() {
    if (!this.data.text.trim()) {
      wx.showToast({ title: '请输入成绩', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const draft = await request({
        path: '/api/parse-score-text',
        method: 'POST',
        data: {
          text: this.data.text,
          student: {
            city: this.data.city,
            grade: this.data.grade
          },
          exam: {
            name: this.data.examName,
            date: new Date().toISOString().slice(0, 10)
          }
        }
      })
      if (!draft.subjects || !draft.subjects.length) {
        showError('未解析到成绩', {
          detail: '没有从文字中识别出科目和分数。请按“数学108分，英语126分”这种格式输入。'
        })
        return
      }
      setScoreDraft(draft)
      wx.navigateTo({ url: '/pages/confirm/index' })
    } catch (error) {
      showError('解析失败', error)
      console.error(error)
    } finally {
      this.setData({ loading: false })
    }
  }
})
