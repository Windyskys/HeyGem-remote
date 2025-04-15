import { ipcMain } from 'electron'
import log from '../logger.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getContext, saveContext } from './context.js'
import { makeAudio } from './voice.js'
import { assetPath } from '../config/config.js'
import axios from 'axios'

const MODEL_NAME = 'chat'

// 保存聊天历史记录
const historyMap = new Map()

/**
 * 发送消息给大语言模型并获取回复
 * @param {string} sessionId 会话ID
 * @param {string} message 用户消息
 * @param {string} persona 人设指令
 * @returns {Promise<string>} AI回复
 */
export async function sendMessage(sessionId, message, persona = '') {
  try {
    log.debug(`[Chat] Sending message for session ${sessionId}`)
    
    if (!historyMap.has(sessionId)) {
      historyMap.set(sessionId, [])
    }
    
    const history = historyMap.get(sessionId)
    history.push({ role: 'user', content: message })
    
    // 获取API密钥
    const apiKey = await getContext('deepseekApiKey')
    if (!apiKey) {
      log.error('[Chat] No API key found')
      throw new Error('API key not configured')
    }
    
    // 构造请求体
    let requestBody = {
      messages: [...history]
    }
    
    // 如果存在人设，添加系统指令
    if (persona && persona.trim()) {
      requestBody.messages.unshift({
        role: 'system',
        content: persona.trim()
      })
    }
    
    // 调用大语言模型API
    // 这里使用Deepseek API作为示例，可以根据实际情况替换
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )
    
    // 处理响应
    const assistantMessage = response.data.choices[0].message.content
    
    // 保存到历史记录
    history.push({ role: 'assistant', content: assistantMessage })
    
    // 限制历史记录长度，避免过长
    if (history.length > 20) {
      history.splice(0, 2) // 删除最旧的一组对话
    }
    
    return assistantMessage
  } catch (error) {
    log.error('[Chat] Error sending message:', error)
    throw error
  }
}

/**
 * 获取某个会话的历史记录
 * @param {string} sessionId 会话ID
 * @returns {Array} 历史记录数组
 */
export function getSessionHistory(sessionId) {
  return historyMap.get(sessionId) || []
}

/**
 * 清除指定会话的历史记录
 * @param {string} sessionId 会话ID
 */
export function clearSessionHistory(sessionId) {
  historyMap.delete(sessionId)
  return true
}

/**
 * 将文本转换为语音
 * @param {string} voiceId 音色ID
 * @param {string} text 要转换的文本
 * @returns {Promise<string>} 音频文件路径
 */
export async function textToSpeech(voiceId, text) {
  try {
    log.debug(`[Chat] Converting text to speech with voice ${voiceId}`)
    const audioPath = await makeAudio({ voiceId, text, targetDir: assetPath.ttsProduct })
    return path.join(assetPath.ttsProduct, audioPath)
  } catch (error) {
    log.error('[Chat] Error converting text to speech:', error)
    throw error
  }
}

/**
 * 语音识别功能
 * @param {string} audioPath 音频文件路径
 * @returns {Promise<string>} 识别后的文本
 */
export async function speechToText(audioPath) {
  try {
    log.debug(`[Chat] Converting speech to text from ${audioPath}`)
    
    // 获取API密钥
    const apiKey = await getContext('deepseekApiKey')
    if (!apiKey) {
      log.error('[Chat] No API key found for speech recognition')
      throw new Error('API key not configured')
    }
    
    // 读取音频文件内容
    const audioBuffer = fs.readFileSync(audioPath)
    const audioBase64 = audioBuffer.toString('base64')
    
    // 调用语音识别API (示例使用API，请根据实际选择的服务替换)
    const response = await axios.post(
      'https://api.deepseek.com/v1/audio/transcriptions',
      {
        file: audioBase64,
        model: 'deepseek-audio'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )
    
    return response.data.text
  } catch (error) {
    log.error('[Chat] Error in speech to text:', error)
    throw error
  }
}

/**
 * 开始录音
 * @param {Object} event Electron事件对象
 * @returns {Promise<string>} 临时录音文件路径
 */
export function startRecording(event) {
  const recordingId = crypto.randomUUID()
  const tempFilePath = path.join(require('os').tmpdir(), `${recordingId}.wav`)
  
  log.debug(`[Chat] Starting recording to ${tempFilePath}`)
  
  // 这里需要调用系统录音API
  // 由于具体实现依赖于平台，这里只是示例框架
  // 实际实现可能需要使用Node.js录音库或平台特定API
  
  // 返回录音ID，用于后续停止录音
  return tempFilePath
}

/**
 * 停止录音并返回识别结果
 * @param {string} recordingPath 录音文件路径
 * @returns {Promise<string>} 识别后的文本
 */
export async function stopRecording(recordingPath) {
  log.debug(`[Chat] Stopping recording from ${recordingPath}`)
  
  // 停止录音
  // 同样，这里需要实际的录音停止实现
  
  // 将录音文件转换为文本
  const text = await speechToText(recordingPath)
  
  return text
}

/**
 * 初始化IPC通信
 */
export function init() {
  // 发送消息获取回复
  ipcMain.handle(MODEL_NAME + '/sendMessage', async (event, sessionId, message, persona) => {
    return sendMessage(sessionId, message, persona)
  })
  
  // 获取历史记录
  ipcMain.handle(MODEL_NAME + '/getHistory', (event, sessionId) => {
    return getSessionHistory(sessionId)
  })
  
  // 清除历史记录
  ipcMain.handle(MODEL_NAME + '/clearHistory', (event, sessionId) => {
    return clearSessionHistory(sessionId)
  })
  
  // 文本转语音
  ipcMain.handle(MODEL_NAME + '/textToSpeech', async (event, voiceId, text) => {
    return textToSpeech(voiceId, text)
  })
  
  // 开始录音
  ipcMain.handle(MODEL_NAME + '/startRecording', (event) => {
    return startRecording(event)
  })
  
  // 停止录音并返回识别结果
  ipcMain.handle(MODEL_NAME + '/stopRecording', async (event, recordingPath) => {
    return stopRecording(recordingPath)
  })
}
