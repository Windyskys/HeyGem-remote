export function videoPage({ page = 1, pageSize = 1, name = '' }) {
  return window.electron.ipcRenderer.invoke('video/page', { page, pageSize, name })
}

export function findVideo(id) {
  return window.electron.ipcRenderer.invoke('video/find', id)
}

export function removeVideo(id) {
  return window.electron.ipcRenderer.invoke('video/remove', id)
}

export function saveVideo(video) {
  return window.electron.ipcRenderer.invoke('video/save', video)
}

export function makeVideo(id) {
  return window.electron.ipcRenderer.invoke('video/make', id)
}

export function exportVideo(id, outputPath) {
  return window.electron.ipcRenderer.invoke('video/export', id, outputPath)
}

export function modifyVideo(video) {
  return window.electron.ipcRenderer.invoke('video/modify', video)
}

export function countVideo(name = '') {
  return window.electron.ipcRenderer.invoke('video/count', name)
}

export function modelPage({ page = 1, pageSize = 1, name = '' }) {
  return window.electron.ipcRenderer.invoke('model/page', { page, pageSize, name })
  
}

export function findModel(id) {
  return window.electron.ipcRenderer.invoke('model/find', id)
}

export function addModel({ name, videoPath }) {
  return window.electron.ipcRenderer.invoke('model/addModel', name, videoPath)
}

export function countModel(name = '') {
  return window.electron.ipcRenderer.invoke('model/count', name)
}

export function removeModel(id) {
  return window.electron.ipcRenderer.invoke('model/remove', id)
}

export function getContext(key) {
  return window.electron.ipcRenderer.invoke('context/get', key)
}

export function saveContext(key, val) {
  return window.electron.ipcRenderer.invoke('context/save', key, val)
}

export function audition(voiceId, text) {
  return window.electron.ipcRenderer.invoke('voice/audition', voiceId, text)
}

// 发送消息给AI
export function sendChatMessage(sessionId, message, persona) {
  return window.electron.ipcRenderer.invoke('chat/sendMessage', sessionId, message, persona)
}

// 获取聊天历史记录
export function getChatHistory(sessionId) {
  return window.electron.ipcRenderer.invoke('chat/getHistory', sessionId)
}

// 清除聊天历史
export function clearChatHistory(sessionId) {
  return window.electron.ipcRenderer.invoke('chat/clearHistory', sessionId)
}

// 文本转语音（聊天专用）
export function chatTextToSpeech(voiceId, text) {
  return window.electron.ipcRenderer.invoke('chat/textToSpeech', voiceId, text)
}

// 开始录音
export function startRecording() {
  return window.electron.ipcRenderer.invoke('chat/startRecording')
}

// 停止录音并获取文本
export function stopRecording(recordingPath) {
  return window.electron.ipcRenderer.invoke('chat/stopRecording', recordingPath)
}
