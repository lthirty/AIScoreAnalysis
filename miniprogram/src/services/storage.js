import Taro from '@tarojs/taro'

export function getStorage(key, fallback = null) {
  try {
    const value = Taro.getStorageSync(key)
    return value === '' || value === undefined ? fallback : value
  } catch (error) {
    console.warn('getStorage failed:', error)
    return fallback
  }
}

export function setStorage(key, value) {
  Taro.setStorageSync(key, value)
}

export function removeStorage(key) {
  Taro.removeStorageSync(key)
}
