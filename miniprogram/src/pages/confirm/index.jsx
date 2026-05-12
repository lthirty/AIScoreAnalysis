import React, { useState } from 'react'
import { View, Text, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { SUBJECTS } from '../../shared/constants'
import { calculateTotalScore, normalizeScoreRows } from '../../shared/score'
import { createExamRecord } from '../../services/exam-records'
import './index.scss'

export default function ConfirmPage() {
  const [scores, setScores] = useState(SUBJECTS.map(subject => ({ subject, score: '', maxScore: '' })))

  const updateScore = (index, field, value) => {
    setScores(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )))
  }

  const handleAnalyze = async () => {
    const normalizedScores = normalizeScoreRows(scores)
    const record = await createExamRecord({
      city: '杭州',
      grade: '高一',
      examDate: new Date().toISOString().slice(0, 10),
      totalScore: calculateTotalScore(normalizedScores),
      scores: normalizedScores
    })

    Taro.navigateTo({ url: `/pages/basic-analysis/index?recordId=${record.id}` })
  }

  return (
    <View className="page confirm-page">
      <View className="card">
        <Text className="title">成绩确认</Text>
        <Text className="tip">上排填写个人成绩，下排可选填班级最高分。正式版 OCR 结果会先进入本页由用户确认。</Text>
        {scores.map((item, index) => (
          <View className="score-row" key={item.subject}>
            <Text className="subject">{item.subject}</Text>
            <Input type="digit" value={item.score} placeholder="我的成绩" onInput={event => updateScore(index, 'score', event.detail.value)} />
            <Input type="digit" value={item.maxScore} placeholder="最高分" onInput={event => updateScore(index, 'maxScore', event.detail.value)} />
          </View>
        ))}
        <Button className="primary-button" onClick={handleAnalyze}>确认并开始AI基础分析</Button>
      </View>
      <Button className="back-button" onClick={() => Taro.navigateBack()}>返回上一步</Button>
    </View>
  )
}
