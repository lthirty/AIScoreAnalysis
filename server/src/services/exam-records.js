import { pool } from '../db/pool.js'
import { config } from '../config.js'

export async function getExamRecords(userId) {
  const result = await pool.query(
    `
      SELECT
        r.*,
        COALESCE(json_agg(s.* ORDER BY s.subject) FILTER (WHERE s.id IS NOT NULL), '[]') AS scores
      FROM exam_records r
      LEFT JOIN exam_subject_scores s ON s.record_id = r.id
      WHERE r.user_id = $1
      GROUP BY r.id
      ORDER BY r.exam_date DESC
      LIMIT $2
    `,
    [userId, config.limits.maxExamRecordsPerUser]
  )

  return result.rows
}

export async function createExamRecord(userId, payload) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const recordResult = await client.query(
      `
        INSERT INTO exam_records(user_id, city, grade, exam_date, total_score, class_rank, grade_rank, max_total_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        userId,
        payload.city,
        payload.grade,
        payload.examDate,
        payload.totalScore,
        payload.classRank || null,
        payload.gradeRank || null,
        payload.maxTotalScore || null
      ]
    )
    const record = recordResult.rows[0]

    for (const score of payload.scores || []) {
      await client.query(
        `
          INSERT INTO exam_subject_scores(record_id, user_id, subject, score, full_score, max_score, exam_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [record.id, userId, score.subject, score.score, score.fullScore || null, score.maxScore || null, payload.examDate]
      )
    }

    await client.query('COMMIT')
    return record
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateExamRecord(userId, recordId, payload) {
  const result = await pool.query(
    `
      UPDATE exam_records
      SET city = $3, grade = $4, exam_date = $5, total_score = $6,
          class_rank = $7, grade_rank = $8, max_total_score = $9, updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `,
    [
      recordId,
      userId,
      payload.city,
      payload.grade,
      payload.examDate,
      payload.totalScore,
      payload.classRank || null,
      payload.gradeRank || null,
      payload.maxTotalScore || null
    ]
  )

  if (!result.rows[0]) {
    const error = new Error('考试记录不存在')
    error.statusCode = 404
    throw error
  }

  return result.rows[0]
}

export async function deleteExamRecord(userId, recordId) {
  await pool.query('DELETE FROM exam_records WHERE id = $1 AND user_id = $2', [recordId, userId])
}
