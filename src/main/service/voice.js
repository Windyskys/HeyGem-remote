import { selectAll, insert, selectByID } from '../dao/voice.js'
import { preprocessAndTran, makeAudio as makeAudioApi } from '../api/tts.js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { assetPath, remoteServerConfig } from '../config/config.js'
import log from '../logger.js'
import { ipcMain } from 'electron'
import dayjs from 'dayjs'
import { uploadFile } from '../api/request.js'

const MODEL_NAME = 'voice'

export function getAllTimbre() {
  return selectAll()
}

export async function train(path, lang = 'zh') {
  path = path.replace(/\\/g, '/') // 将路径中的\替换为/
  
  // 如果启用了远程服务器，先上传音频文件
  let remotePath = path;
  if (remoteServerConfig.enabled) {
    try {
      log.debug('Start uploading training audio files to the remote server...');
      const uploadResult = await uploadFile(
        path.join(assetPath.ttsRoot, path), 
        'tts', 
        'origin_audio'
      );
      remotePath = uploadResult.remotePath;
      log.debug('Training audio files uploaded successfully:', remotePath);
    } catch (error) {
      log.error('Failed to upload training audio files:', error);
      throw new Error(`Failed to upload training audio files: ${error.message}`);
    }
  }
  
  const res = await preprocessAndTran({
    format: path.split('.').pop(),
    reference_audio: remotePath,
    lang
  })
  log.debug('~ train ~ res:', res)
  if (res.code !== 0) {
    return false
  } else {
    const { asr_format_audio_url, reference_audio_text } = res
    return insert({ origin_audio_path: path, lang, asr_format_audio_url, reference_audio_text })
  }
}

export function makeAudio4Video({voiceId, text}) {
  return makeAudio({voiceId, text, targetDir: assetPath.ttsProduct})
}

export function copyAudio4Video(filePath) {
  // 将filePath复制到ttsProduct目录下
  const targetDir = assetPath.ttsProduct
  const fileName = dayjs().format('YYYYMMDDHHmmssSSS') + path.extname(filePath)
  const targetPath = path.join(targetDir, fileName)
  fs.copyFileSync(filePath, targetPath)
  
  // 如果启用了远程服务器，上传复制的音频文件
  if (remoteServerConfig.enabled) {
    try {
      log.debug('Start uploading copied audio file to the remote server...');
      uploadFile(targetPath, 'tts', 'products').then(uploadResult => {
        log.debug('Copied audio file uploaded successfully:', uploadResult.remotePath);
      });
    } catch (error) {
      log.error('Failed to upload copied audio file:', error);
      // 不抛出异常，继续后续处理
    }
  }
  
  return fileName
}

export async function makeAudio({voiceId, text, targetDir}) {
  const uuid = crypto.randomUUID()
  const voice = selectByID(voiceId)

  return makeAudioApi({
    speaker: uuid,
    text,
    format: 'wav',
    topP: 0.7,
    max_new_tokens: 1024,
    chunk_length: 100,
    repetition_penalty: 1.2,
    temperature: 0.7,
    need_asr: false,
    streaming: false,
    is_fixed_seed: 0,
    is_norm: 0,
    reference_audio: voice.asr_format_audio_url,
    reference_text: voice.reference_audio_text
  })
    .then((res) => {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {  
          recursive: true
        })
      }
      fs.writeFileSync(path.join(targetDir, `${uuid}.wav`), res, 'binary')
      return `${uuid}.wav`
    })
    .catch((error) => {
      log.error('Error generating audio:', error)
      throw error
    })
}

/**
 * 试听音频
 * @param {string} voiceId 
 * @param {string} text 
 * @returns 
 */
export async function audition(voiceId, text) {
  const tmpDir = require('os').tmpdir()
  console.log("🚀 ~ audition ~ tmpDir:", tmpDir)
  const audioPath = await makeAudio({ voiceId, text, targetDir: tmpDir })
  return path.join(tmpDir, audioPath)
}

export function init() {
  ipcMain.handle(MODEL_NAME + '/audition', (event, ...args) => {
    return audition(...args)
  })
}