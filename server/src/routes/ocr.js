import express from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { withAiConcurrencyLimit } from '../middleware/ai-concurrency.js'
import { runOcr } from '../services/ai-client.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
})

export const ocrRouter = express.Router()

ocrRouter.use(requireAuth)

ocrRouter.post('/score-sheet', upload.single('file'), withAiConcurrencyLimit(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: '缺少截图文件' })
    return
  }

  res.json(await runOcr({
    fileBuffer: req.file.buffer,
    mimeType: req.file.mimetype,
    type: req.body.type
  }))
}))
