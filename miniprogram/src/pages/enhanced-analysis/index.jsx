import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'

export default function EnhancedAnalysisPage() {
  return (
    <View className="page">
      <View className="card">
        <Text>AI增强分析</Text>
        <Text>这里接入各科试卷附件、手动题型得分、统一分析、图片/PDF导出。</Text>
      </View>
      <Button className="primary-button" onClick={() => Taro.navigateBack()}>返回上一步</Button>
    </View>
  )
}
