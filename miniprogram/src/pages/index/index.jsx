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
      <View className="card">
        <Text className="title">AI成绩分析</Text>
        <Text className="subtitle">正式小程序端入口，数据通过后端保存，AI Key 不进入小程序包。</Text>
        <Text className="login-state">当前账号：{loginState}</Text>
        <Button className="primary-button" onClick={handleLogin}>微信登录</Button>
        <Button className="primary-button" onClick={handleUpload}>导入成绩截图</Button>
        <Button className="secondary-button" onClick={handleManualInput}>手动输入成绩</Button>
      </View>
    </View>
  )
}
