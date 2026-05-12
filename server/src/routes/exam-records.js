import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  createExamRecord,
  deleteExamRecord,
  getExamRecords,
  updateExamRecord
} from '../services/exam-records.js'

export const examRecordsRouter = express.Router()

examRecordsRouter.use(requireAuth)

examRecordsRouter.get('/', async (req, res, next) => {
  try {
    res.json(await getExamRecords(req.user.userId))
  } catch (error) {
    next(error)
  }
})

examRecordsRouter.post('/', async (req, res, next) => {
  try {
    res.status(201).json(await createExamRecord(req.user.userId, req.body))
  } catch (error) {
    next(error)
  }
})

examRecordsRouter.put('/:id', async (req, res, next) => {
  try {
    res.json(await updateExamRecord(req.user.userId, req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

examRecordsRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteExamRecord(req.user.userId, req.params.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
