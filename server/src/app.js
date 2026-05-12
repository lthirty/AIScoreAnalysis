import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import { authRouter } from './routes/auth.js'
import { examRecordsRouter } from './routes/exam-records.js'
import { analysisRouter } from './routes/analysis.js'
import { ocrRouter } from './routes/ocr.js'
import { exportsRouter } from './routes/exports.js'
import { errorHandler } from './middleware/error-handler.js'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'aiscoreanalysis-server' })
})

app.use('/api/auth', authRouter)
app.use('/api/exam-records', examRecordsRouter)
app.use('/api/ocr', ocrRouter)
app.use('/api/analysis', analysisRouter)
app.use('/api/exports', exportsRouter)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`AIScoreAnalysis server listening on ${config.port}`)
})
