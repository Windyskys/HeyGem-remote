import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import { isEmpty } from 'lodash'
import { insert, selectPage, count, selectByID, remove as deleteModel } from '../dao/f2f-model.js'
import { train as trainVoice } from './voice.js'
import { assetPath, remoteServerConfig } from '../config/config.js'
import log from '../logger.js'
import { extractAudio } from '../util/ffmpeg.js'
import { uploadFile } from '../api/request.js'

const MODEL_NAME = 'model'

/**
 * 新增模特
 * @param {string} modelName 模特名称
 * @param {string} videoPath 模特视频路径
 * @returns
 */
async function addModel(modelName, videoPath) {
  if (!fs.existsSync(assetPath.model)) {
    fs.mkdirSync(assetPath.model, {
      recursive: true
    })
  }
  
  // 如果启用了远程服务器，先上传文件到服务器
  let remoteVideoPath = videoPath;
  if (remoteServerConfig.enabled) {
    try {
      log.debug('Start uploading model video file to remote server...');
      const uploadResult = await uploadFile(videoPath, 'face2face', 'models');
      remoteVideoPath = uploadResult.remotePath;
      log.debug('Model video file uploaded successfully:', remoteVideoPath);
    } catch (error) {
      log.error('Failed to upload model video file:', error);
      throw new Error(`Failed to upload model video file: ${error.message}`);
    }
  }
  
  // copy video to model video path
  const extname = path.extname(videoPath)
  const modelFileName = dayjs().format('YYYYMMDDHHmmssSSS') + extname
  const modelPath = path.join(assetPath.model, modelFileName)

  // 使用本地文件路径复制文件
  fs.copyFileSync(videoPath, modelPath)

  // 用ffmpeg分离音频
  if (!fs.existsSync(assetPath.ttsTrain)) {
    fs.mkdirSync(assetPath.ttsTrain, {
      recursive: true
    })
  }
  const audioPath = path.join(assetPath.ttsTrain, modelFileName.replace(extname, '.wav'))
  
  return extractAudio(modelPath, audioPath).then(async () => {
    // 如果启用了远程服务器，上传分离出的音频文件
    let remoteAudioPath = audioPath;
    if (remoteServerConfig.enabled) {
      try {
        log.debug('Start uploading model audio file to remote server...');
        const uploadResult = await uploadFile(audioPath, 'tts', 'origin_audio');
        remoteAudioPath = uploadResult.remotePath;
        log.debug('Model audio file uploaded successfully:', remoteAudioPath);
      } catch (error) {
        log.error('Failed to upload model audio file:', error);
        throw new Error(`Failed to upload model audio file: ${error.message}`);
      }
    }
    
    // 训练语音模型
    const relativeAudioPath = path.relative(assetPath.ttsRoot, audioPath)
    if (process.env.NODE_ENV === 'development') {
      // TODO 写死调试
      return trainVoice(relativeAudioPath, 'zh')
    } else {
      return trainVoice(relativeAudioPath, 'zh')
    }
  }).then((voiceId)=>{
    // 插入模特信息
    const relativeModelPath = path.relative(assetPath.model, modelPath)
    const relativeAudioPath = path.relative(assetPath.ttsRoot, audioPath)

    // const safeVoiceId = voiceId === false ? null : voiceId;

    // insert model info to db
    const id = insert({ modelName, videoPath: relativeModelPath, audioPath: relativeAudioPath, voiceId })
    return id
  })
}

function page({ page, pageSize, name = '' }) {
  const total = count(name)
  return {
    total,
    list: selectPage({ page, pageSize, name }).map((model) => ({
      ...model,
      video_path: path.join(assetPath.model, model.video_path),
      audio_path: path.join(assetPath.ttsRoot, model.audio_path)
    }))
  }
}

function findModel(modelId) {
  const model = selectByID(modelId)
  return {
    ...model,
    video_path: path.join(assetPath.model, model.video_path),
    audio_path: path.join(assetPath.ttsRoot, model.audio_path)
  }
}

function removeModel(modelId) {
  const model = selectByID(modelId)
  log.debug('~ removeModel ~ modelId:', modelId)

  // 删除视频
  const videoPath = path.join(assetPath.model, model.video_path ||'')
  if (!isEmpty(model.video_path) && fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath)
  }

  // 删除音频
  const audioPath = path.join(assetPath.ttsRoot, model.audio_path ||'')
  if (!isEmpty(model.audio_path) && fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath)
  }

  deleteModel(modelId)
}

function countModel(name = '') {
  return count(name)
}

export function init() {
  ipcMain.handle(MODEL_NAME + '/addModel', (event, ...args) => {
    return addModel(...args)
  })
  ipcMain.handle(MODEL_NAME + '/page', (event, ...args) => {
    return page(...args)
  })
  ipcMain.handle(MODEL_NAME + '/find', (event, ...args) => {
    return findModel(...args)
  })
  ipcMain.handle(MODEL_NAME + '/count', (event, ...args) => {
    return countModel(...args)
  })
  ipcMain.handle(MODEL_NAME + '/remove', (event, ...args) => {
    return removeModel(...args)
  })
}
