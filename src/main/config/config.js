import path from 'path'
import os from 'os'

const isDev = process.env.NODE_ENV === 'development'
const isWin = process.platform === 'win32'

// 添加远程服务器配置 - 您可以根据实际需求修改这些值
export const remoteServerConfig = {
  enabled: true, // 默认不启用，需要时手动改为true
  serverAddress: 'http://192.168.103.103', // 替换为您的Ubuntu服务器IP
  // 根据实际部署修改以下路径
  fileUploadPath: '/upload',
  fileDownloadPath: '/download',
  // 根据Docker挂载路径设置
  paths: {
    tts: '/code/data',
    face2face: '/code/data'
  },
  // 添加本地服务地址配置
  localAddress: 'http://127.0.0.1'
}

// 将静态对象改为函数，动态返回正确的URL
export function getServiceUrl() {
  // 根据远程模式决定使用哪个地址
  const baseUrl = remoteServerConfig.enabled ? 
    remoteServerConfig.serverAddress : 
    remoteServerConfig.localAddress;
    
  return {
    face2face: `${baseUrl}/easy`,
    tts: `${baseUrl}:18180`
  }
}

// 保持原有的serviceUrl对象向后兼容
export const serviceUrl = {
  get face2face() { return getServiceUrl().face2face },
  get tts() { return getServiceUrl().tts }
}

export const assetPath = {
  model: isWin
    ? path.join('D:', 'heygem_data', 'face2face', 'temp')
    : path.join(os.homedir(), 'heygem_data', 'face2face', 'temp'), // 模特视频
  ttsProduct: isWin
    ? path.join('D:', 'heygem_data', 'face2face', 'temp')
    : path.join(os.homedir(), 'heygem_data', 'face2face', 'temp'), // TTS 产物
  ttsRoot: isWin
    ? path.join('D:', 'heygem_data', 'voice', 'data')
    : path.join(os.homedir(), 'heygem_data', 'voice', 'data'), // TTS服务根目录
  ttsTrain: isWin
    ? path.join('D:', 'heygem_data', 'voice', 'data', 'origin_audio')
    : path.join(os.homedir(), 'heygem_data', 'voice', 'data', 'origin_audio') // TTS 训练产物
}
