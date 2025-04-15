import { ipcMain } from 'electron'
import { remoteServerConfig, serviceUrl } from '../config/config.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

// 配置文件路径
const configFilePath = path.join(os.homedir(), '.heygem', 'server-config.json')

// 确保配置目录存在
function ensureConfigDir() {
  const configDir = path.dirname(configFilePath)
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
}

// 保存配置到文件
function saveConfigToFile(config) {
  ensureConfigDir()
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2))
}

// 从文件读取配置
function loadConfigFromFile() {
  ensureConfigDir()
  if (!fs.existsSync(configFilePath)) {
    saveConfigToFile(remoteServerConfig)
    return remoteServerConfig
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'))
    return config
  } catch (error) {
    console.error('Failed to read server config:', error)
    return remoteServerConfig
  }
}

// 注册IPC处理函数
export function registerServerConfigHandlers() {
  // 获取服务器配置
  ipcMain.handle('get-server-config', () => {
    return loadConfigFromFile()
  })
  
  // 更新服务器配置
  ipcMain.handle('update-server-config', (_, newConfig) => {
    try {
      const currentConfig = loadConfigFromFile()
      const updatedConfig = { ...currentConfig, ...newConfig }
      
      // 更新内存中的配置
      Object.assign(remoteServerConfig, updatedConfig)
      
      // 保存到文件
      saveConfigToFile(updatedConfig)
      
      return { success: true }
    } catch (error) {
      console.error('Failed to update server config:', error)
      return { success: false, error: error.message }
    }
  })
}

// 启动时加载配置
export function loadConfigOnStartup() {
  const savedConfig = loadConfigFromFile()
  Object.assign(remoteServerConfig, savedConfig)
  console.log('Load config on startup:', {
    ...remoteServerConfig,
    deepseekApiKey: remoteServerConfig.deepseekApiKey ? '******' : '' // 日志中隐藏实际的 API Key
  })
  
  // 如果有serviceUrl相关更新，也更新它
  if (!savedConfig.enabled) {
    // 使用本地地址
    const localAddress = savedConfig.localAddress || 'http://127.0.0.1';
    
    // 更新remoteServerConfig的localAddress
    remoteServerConfig.localAddress = localAddress;
    console.log('Updated remoteServerConfig to local address:', {
      ...remoteServerConfig,
      deepseekApiKey: remoteServerConfig.deepseekApiKey ? '******' : '' // 日志中隐藏实际的 API Key
    });
  }
} 