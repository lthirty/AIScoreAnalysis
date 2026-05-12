import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { withAiConcurrencyLimit } from '../middleware/ai-concurrency.js'
import { runAnalysis } from '../services/ai-client.js'

export const analysisRouter = express.Router()

analysisRouter.use(requireAuth)

analysisRouter.post('/basic', withAiConcurrencyLimit(async (req, res) => {
  res.json(await runAnalysis({
    userId: req.user.userId,
    type: 'basic',
    payload: req.body
  }))
}))

analysisRouter.post('/enhanced', withAiConcurrencyLimit(async (req, res) => {
  res.json(await runAnalysis({
    userId: req.user.userId,
    type: 'enhanced',
    payload: req.body
  }))
}))

analysisRouter.post('/subject-trend', withAiConcurrencyLimit(async (req, res) => {
  res.json(await runAnalysis({
    userId: req.user.userId,
    type: 'subject-trend',
    payload: req.body
  }))
}))
