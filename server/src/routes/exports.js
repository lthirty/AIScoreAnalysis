import express from 'express'
import { requireAuth } from '../middleware/auth.js'

export const exportsRouter = express.Router()

exportsRouter.use(requireAuth)

exportsRouter.post('/report-pdf', async (req, res) => {
  res.status(501).json({
    message: 'PDF导出将在接入模板渲染服务后启用；小程序端应使用 wx.downloadFile 和 wx.openDocument 打开生成文件。'
  })
})
