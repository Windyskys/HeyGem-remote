import { ipcMain } from 'electron'
import log from '../logger.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getContext, saveContext } from './context.js'
import { makeAudio } from './voice.js'
import { assetPath } from '../config/config.js'
import axios from 'axios'
import { recognizeSpeech } from './whisper.js'
import recorder from 'node-record-lpcm16'

const MODEL_NAME = 'chat'

// 保存聊天历史记录
const historyMap = new Map()

// 创建录音实例对象的Map
const recorderMap = new Map()

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
    
    // 获取API密钥 - 修改这里的处理逻辑
    const apiKeyData = await getContext('deepseekApiKey')
    // 数据库查询返回包含val字段的对象，需要提取实际的密钥值
    const apiKey = apiKeyData?.val
    
    if (!apiKey) {
      log.error('[Chat] No API key found or invalid format')
      throw new Error('API key not configured or invalid')
    }
    
    log.debug(`[Chat] Using API key: ${apiKey.substring(0, 4)}...${apiKey.slice(-4)}`) // 仅记录部分密钥用于调试
    
    // 构造请求体
    let requestBody = {
      messages: [...history],
      model: "deepseek-chat" // 添加必要的model参数
    }
    
    // 如果存在人设，添加系统指令
    if (persona && persona.trim()) {
      requestBody.messages.unshift({
        role: 'system',
        content: persona.trim()
      })
    }
    
    // 调用大语言模型API
    try {
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
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
    } catch (axiosError) {
      // 详细记录API错误
      if (axiosError.response) {
        log.error(`[Chat] API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`)
        
        // 针对不同状态码提供更具体的错误信息
        if (axiosError.response.status === 401) {
          throw new Error('API认证失败(401)：请检查您的DeepSeek API密钥是否有效')
        } else if (axiosError.response.status === 400) {
          throw new Error(`API参数错误(400)：${JSON.stringify(axiosError.response.data)}`)
        } else {
          throw new Error(`API错误(${axiosError.response.status})：${JSON.stringify(axiosError.response.data)}`)
        }
      }
      throw axiosError
    }
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
    console.log(`[调试] 开始处理音频文件: ${audioPath}`)
    
    // 检查音频文件是否存在且非空
    const audioBuffer = fs.readFileSync(audioPath)
    const audioSize = audioBuffer.length
    console.log(`[调试] 音频文件大小: ${audioSize} 字节`)
    
    // 检查音频文件是否为空
    if (audioSize === 0) {
      console.error('[调试] 音频文件为空')
      throw new Error('Empty audio file')
    }
    
    // 获取Whisper模型大小
    const modelSize = await getContext('whisperModelSize') || 'tiny'
    console.log(`[调试] 使用Whisper模型: ${modelSize}`)
    
    // 调用本地Whisper进行识别
    console.log('[调试] 调用本地Whisper进行识别...')
    const text = await recognizeSpeech(audioPath, modelSize)
    console.log('[调试] Whisper识别结果:', text)
    
    return text
  } catch (error) {
    log.error('[Chat] Error in speech to text:', error)
    console.error('[调试] 语音识别错误:', error)
    throw error
  }
}

/**
 * 开始录音
 * @param {Object} event Electron事件对象
 * @returns {Promise<string>} 临时录音文件路径
 */
export function startRecording(event) {
  try {
    const recordingId = crypto.randomUUID()
    const tempFilePath = path.join(require('os').tmpdir(), `${recordingId}.wav`)
    
    log.debug(`[Chat] Starting recording to ${tempFilePath}`)
    
    // 创建文件写入流
    const fileStream = fs.createWriteStream(tempFilePath)
    
    // 开始录音
    const recording = recorder.record({
      sampleRate: 16000,
      channels: 1,
      audioType: 'wav'
    })
    
    // 将录音数据写入文件
    recording.stream().pipe(fileStream)
    
    // 保存录音实例
    recorderMap.set(recordingId, {
      recording,
      fileStream,
      tempFilePath
    })
    
    return recordingId
  } catch (error) {
    log.error('[Chat] Error starting recording:', error)
    throw error
  }
}

/**
 * 停止录音并返回识别结果
 * @param {string} recordingId 录音ID
 * @returns {Promise<string>} 识别后的文本
 */
export async function stopRecording(recordingId) {
  try {
    const recordingData = recorderMap.get(recordingId)
    if (!recordingData) {
      throw new Error(`No recording found with ID ${recordingId}`)
    }
    
    const { recording, fileStream, tempFilePath } = recordingData
    
    // 停止录音
    recording.stop()
    
    // 等待文件写入完成
    await new Promise(resolve => {
      fileStream.on('finish', resolve)
    })
    
    // 从Map中移除录音实例
    recorderMap.delete(recordingId)
    
    // 处理音频文件...
    const text = await speechToText(tempFilePath)
    return text
  } catch (error) {
    log.error('[Chat] Error stopping recording:', error)
    throw error
  }
}

/**
 * 处理从渲染进程发送的录音数据
 * @param {Uint8Array} audioData 音频数据
 * @returns {Promise<Object>} 处理结果
 */
export async function processAudio(audioData) {
  try {
    log.debug('[Chat] Processing audio data, size: ' + audioData.length + ' bytes')
    
    // 创建临时文件路径
    const tempFilePath = path.join(require('os').tmpdir(), `recording-${crypto.randomUUID()}.wav`)
    
    // 将音频数据写入临时文件
    fs.writeFileSync(tempFilePath, Buffer.from(audioData))
    log.debug('[Chat] Audio data saved to: ' + tempFilePath)
    
    // 调用语音识别函数
    log.debug('[Chat] Starting speech recognition...')
    const text = await speechToText(tempFilePath)
    
    // 在控制台输出结果用于调试
    console.log('=========== 语音识别结果 ===========')
    console.log(text)
    console.log('===================================')
    
    // 在日志中也记录结果
    log.info('[Chat] Speech recognition result: ' + text)
    
    // 可选：删除临时文件
    fs.unlinkSync(tempFilePath)
    log.debug('[Chat] Temporary audio file deleted')
    
    return { success: true, text }
  } catch (error) {
    log.error('[Chat] Error processing audio:', error)
    console.error('语音识别错误:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 添加测试API密钥的功能
 * @param {string} apiKey API密钥
 * @returns {Promise<Object>} 验证结果
 */
export async function testApiKey(apiKey) {
  try {
    // 构造最简单的请求体
    const requestBody = {
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 1 // 仅请求极少量token以快速验证
    }
    
    // 调用API验证密钥
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
    
    return { success: true, data: response.data }
  } catch (error) {
    log.error('[Chat] API key validation error:', error)
    let errorMessage = '验证失败'
    
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = 'API密钥无效或已过期'
      } else {
        errorMessage = `错误(${error.response.status}): ${JSON.stringify(error.response.data)}`
      }
    }
    
    throw new Error(errorMessage)
  }
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
  ipcMain.handle(MODEL_NAME + '/stopRecording', async (event, recordingId) => {
    return stopRecording(recordingId)
  })
  
  // 添加处理录音数据的IPC处理程序
  ipcMain.handle(MODEL_NAME + '/processAudio', async (event, audioData) => {
    return processAudio(audioData)
  })
  
  // 添加测试API密钥的IPC处理程序
  ipcMain.handle(MODEL_NAME + '/testApiKey', async (event, apiKey) => {
    return testApiKey(apiKey)
  })
  
  log.info('[Chat] IPC handlers registered successfully')
}
