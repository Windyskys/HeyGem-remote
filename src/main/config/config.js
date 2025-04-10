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
  }
}

export const serviceUrl = {
  face2face: isDev ? 'http://192.168.103.103/easy' : 'http://192.168.103.103/easy',
  tts: isDev ? 'http://192.168.103.103:18180' : 'http://192.168.103.103:18180'
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
