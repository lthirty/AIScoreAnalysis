const { uploadScoreImage } = require('../../utils/upload')
const { showError } = require('../../utils/error')
const { getPreferences, setPreferences, setScoreDraft } = require('../../utils/storage')
const { parseScoreText } = require('../../utils/scoreParser')

Page({
  data: {
    mode: 'text',
    textModeClass: 'active',
    imageModeClass: '',
    showTextMode: true,
    showImageMode: false,
    modeIcon: '文',
    modeText: '适合已经有成绩文字或家长口述场景，解析后仍会进入确认页。',
    examDate: '',
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

  onShow() {
    const preferences = getPreferences()
    this.setData({
      city: preferences.city || this.data.city,
      grade: preferences.grade || this.data.grade
    })
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    this.setData({
      mode,
      textModeClass: mode === 'text' ? 'active' : '',
      imageModeClass: mode === 'image' ? 'active' : '',
      showTextMode: mode === 'text',
      showImageMode: mode === 'image',
      modeIcon: mode === 'text' ? '文' : '图',
      modeText: mode === 'text'
        ? '适合已经有成绩文字或家长口述场景，解析后仍会进入确认页。'
        : '沿用原 Web 版双截图逻辑：个人成绩必填，最高分/排名图可选。'
    })
  },

  onExamDateChange(event) {
    this.setData({ examDate: event.detail.value })
  },

  onCityInput(event) {
    const city = event.detail.value
    this.setData({ city })
    this.savePreferences({ city })
  },

  onGradeInput(event) {
    const grade = event.detail.value
    this.setData({ grade })
    this.savePreferences({ grade })
  },

  onExamInput(event) {
    this.setData({ examName: event.detail.value })
  },

  onTextInput(event) {
    this.setData({ text: event.detail.value })
  },

  savePreferences(nextValues) {
    const current = getPreferences()
    setPreferences({
      ...current,
      city: nextValues.city !== undefined ? nextValues.city : this.data.city,
      grade: nextValues.grade !== undefined ? nextValues.grade : this.data.grade
    })
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
    if (!this.data.examDate) {
      wx.showToast({ title: '请先选择考试时间', icon: 'none' })
      return
    }

    this.setData({ ocrLoading: true })
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
          date: this.data.examDate
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
      this.setData({ ocrLoading: false })
    }
  },

  async parseScore() {
    if (!this.data.text.trim()) {
      wx.showToast({ title: '请输入成绩', icon: 'none' })
      return
    }
    if (!this.data.examDate) {
      wx.showToast({ title: '请先选择考试时间', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const draft = parseScoreText(this.data.text, {
        city: this.data.city,
        grade: this.data.grade
      }, {
        name: this.data.examName,
        date: this.data.examDate
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
