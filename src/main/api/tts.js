import request from './request.js'
import { serviceUrl, remoteServerConfig, assetPath } from '../config/config.js'
import log from '../logger.js'
import path from 'path'
import fs from 'fs'
import { uploadFile, downloadFile } from './request.js'

export async function makeAudio(param) {
  log.debug('~ makeAudio ~ param:', JSON.stringify(param))
  
  // 如果启用了远程服务器且参数中包含本地文件路径，则先上传文件
  if (remoteServerConfig.enabled && param.filePath) {
    try {
      const uploadResult = await uploadFile(param.filePath, 'tts', 'tts_inputs')
      param.filePath = uploadResult.remotePath // 使用服务器上的文件路径
    } catch (error) {
      log.error('Upload file failed:', error)
      throw error
    }
  }
  
  const response = await request.post(`${serviceUrl.tts}/v1/invoke`, param, {
    responseType: 'arraybuffer'
  })
  
  // 如果启用了远程服务器并且返回了文件路径，则下载文件
  if (remoteServerConfig.enabled && response.filePath) {
    // 确保本地保存目录存在
    const savePath = path.join(assetPath.ttsProduct, path.basename(response.filePath))
    if (!fs.existsSync(path.dirname(savePath))) {
      fs.mkdirSync(path.dirname(savePath), { recursive: true })
    }
    
    try {
      await downloadFile(response.filePath, savePath)
      response.localFilePath = savePath // 添加本地文件路径
    } catch (error) {
      log.error('Download file failed:', error)
      throw error
    }
  }
  
  return response
}

export function preprocessAndTran(param) {
  log.debug('~ preprocessAndTran ~ param:', JSON.stringify(param))
  return request.post(`${serviceUrl.tts}/v1/preprocess_and_tran`, param)
}
