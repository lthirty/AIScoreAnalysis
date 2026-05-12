import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'

export default function BasicAnalysisPage() {
  return (
    <View className="page">
      <View className="card">
        <Text>AI基础分析</Text>
        <Text>这里展示本次成绩、历史趋势、计算依据和模型名称。历史趋势默认展开。</Text>
        <Button className="primary-button" onClick={() => Taro.navigateTo({ url: '/pages/enhanced-analysis/index' })}>AI增强分析</Button>
      </View>
      <Button className="primary-button" onClick={() => Taro.navigateBack()}>返回上一步</Button>
    </View>
  )
}
