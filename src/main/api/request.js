import axios from 'axios'
import path from 'path'
import fs from 'fs'
import FormData from 'form-data'
import { remoteServerConfig } from '../config/config.js'
import log from '../logger.js'

const instance = axios.create({
  timeout: 0
})

instance.interceptors.response.use(function (response) {
  return response.data
})

// 文件上传函数 - 可根据您的实际需求调整
async function uploadFile(filePath, serviceType = 'default', targetPath = '') {
  if (!remoteServerConfig.enabled) {
    // 如果未启用远程服务器，则直接返回本地文件路径
    return { localPath: filePath, remotePath: filePath }
  }
  
  try {
    const fileName = path.basename(filePath)
    const formData = new FormData()
    
    formData.append('file', fs.createReadStream(filePath))
    formData.append('serviceType', serviceType)
    formData.append('targetPath', targetPath || '')
    
    // 您可以根据实际API调整请求URL和参数
    const response = await axios({
      method: 'post',
      url: `${remoteServerConfig.serverAddress}:3001${remoteServerConfig.fileUploadPath}`,
      data: formData,
      headers: {
        ...formData.getHeaders()
      }
    })
    
    log.debug('File upload Success:', response.data)
    return {
      localPath: filePath,
      remotePath: response.data.filePath // 根据实际返回格式调整
    }
  } catch (error) {
    log.error('File upload failed:', error)
    throw new Error(`File upload failed: ${error.message}`)
  }
}

// 文件下载函数 - 可根据您的实际需求调整
async function downloadFile(remoteFilePath, localSavePath) {
  if (!remoteServerConfig.enabled) {
    // 如果未启用远程服务器，则直接返回本地文件路径
    return localSavePath
  }
  
  try {
    const writer = fs.createWriteStream(localSavePath)
    
    // 您可以根据实际API调整请求URL和参数
    const response = await axios({
      method: 'get',
      url: `${remoteServerConfig.serverAddress}:3001${remoteServerConfig.fileDownloadPath}`,
      params: { filePath: remoteFilePath },
      responseType: 'stream'
    })
    
    response.data.pipe(writer)
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        log.debug('File download Success:', localSavePath)
        resolve(localSavePath)
      })
      writer.on('error', (err) => {
        log.error('File download failed:', err)
        reject(err)
      })
    })
  } catch (error) {
    log.error('File download failed:', error)
    throw new Error(`File download failed: ${error.message}`)
  }
}

// 添加文件复制函数 - 在远程服务器上复制已存在的文件
async function copyFileOnServer(sourceFilePath, serviceType = 'default', targetPath = '') {
  if (!remoteServerConfig.enabled) {
    // 如果未启用远程服务器，则直接返回源文件路径
    return { sourcePath: sourceFilePath, targetPath: sourceFilePath }
  }
  
  try {
    // 向服务器发送复制请求
    const response = await axios({
      method: 'post',
      url: `${remoteServerConfig.serverAddress}:3001/copy`,
      data: {
        sourcePath: sourceFilePath,
        serviceType: serviceType,
        targetPath: targetPath || ''
      }
    })
    
    log.debug('File copy Success:', response.data)
    return {
      sourcePath: sourceFilePath,
      targetPath: response.data.targetPath // 根据实际返回格式调整
    }
  } catch (error) {
    log.error('File copy failed:', error)
    throw new Error(`File copy failed: ${error.message}`)
  }
}

// 在这里正确导出这两个函数
export { uploadFile, downloadFile, copyFileOnServer }
export default instance
