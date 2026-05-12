import React, { useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { loginWithWechat } from '../../services/auth'
import './index.scss'

export default function IndexPage() {
  const [loginState, setLoginState] = useState('未登录')

  const handleLogin = async () => {
    const user = await loginWithWechat()
    setLoginState(user.nickname || '微信用户')
  }

  const handleManualInput = () => {
    Taro.navigateTo({ url: '/pages/confirm/index?mode=manual' })
  }

  const handleUpload = async () => {
    const result = await Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera']
    })
    const filePath = result.tempFiles?.[0]?.tempFilePath
    if (filePath) {
      Taro.navigateTo({ url: `/pages/confirm/index?mode=upload&filePath=${encodeURIComponent(filePath)}` })
    }
  }

  return (
    <View className="page index-page">
      <View className="wechat-card">
        <Text className="eyebrow">微信小程序版</Text>
        <Text className="title">AI成绩分析</Text>
        <Text className="subtitle">记录每次考试，结合城市、年级、排名和历史趋势给出分析。</Text>
      </View>

      <View className="card">
        <Text className="section-title">账号与数据</Text>
        <Text className="login-state">当前账号：{loginState}</Text>
        <Button className="primary-button" onClick={handleLogin}>微信登录</Button>
      </View>

      <View className="card action-card">
        <Text className="section-title">录入成绩</Text>
        <Text className="subtitle">导入成绩截图，或直接手动输入成绩。截图识别后会先进入成绩确认页。</Text>
        <Button className="primary-button" onClick={handleUpload}>导入成绩截图</Button>
        <Button className="secondary-button" onClick={handleManualInput}>手动输入成绩</Button>
      </View>
    </View>
  )
}
