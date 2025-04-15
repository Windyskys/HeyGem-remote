<template>
  <div class="chat-content-box">
    <h1>{{ $t('common.chat.title') }}</h1>
    <div class="chat-container">
      <div class="persona-section">
        <div class="section-title">{{ $t('common.chat.persona') }}</div>
        <textarea 
          v-model="persona" 
          :placeholder="$t('common.chat.personaPlaceholder')"
          class="persona-input"
        />
      </div>
      
      <!-- API错误提示框 -->
      <div class="api-error-alert" v-if="apiError">
        <t-alert theme="error" :message="apiErrorMessage" :close="true" @close="apiError = false">
          <template #icon><t-icon name="error-circle-filled" /></template>
          <template #operation>
            <t-button theme="primary" size="small" @click="goToSettings">
              前往设置
            </t-button>
          </template>
        </t-alert>
      </div>
      
      <!-- API密钥状态 -->
      <div class="api-key-status" v-if="apiKeyValue">
        <t-alert theme="success" :message="'当前API密钥: ' + apiKeyValue" :close="true">
          <template #icon><t-icon name="check-circle-filled" /></template>
        </t-alert>
      </div>
      
      <!-- 添加全局音频播放状态指示器 -->
      <div class="audio-status-indicator" v-if="isAudioPlaying">
        <div class="ai-speaking-icon">
          <div class="wave-circle"></div>
          <t-icon name="sound" />
        </div>
        <span>AI正在回答...</span>
      </div>
      
      <!-- 语音识别状态指示器 -->
      <div class="processing-status-indicator" v-if="isProcessing">
        <div class="processing-icon">
          <t-loading theme="dots" size="medium" />
        </div>
        <span>{{ processingStatus }}</span>
      </div>
      
      <div class="chat-messages" ref="messagesContainer">
        <div class="empty-message" v-if="messages.length === 0">
          {{ $t('common.chat.emptyText') }}
        </div>
        <div v-for="(message, index) in messages" :key="index" class="message-item" :class="message.role">
          <div class="message-content">{{ message.content }}</div>
          <div v-if="message.role === 'assistant'" class="audio-controls">
            <div class="audio-wave" :class="{ 'playing': currentPlayingIndex === index }">
              <div v-for="i in 5" :key="i" class="wave-bar"></div>
            </div>
            <!-- 添加播放/暂停控制按钮 -->
            <t-button 
              class="play-btn" 
              theme="default" 
              size="small" 
              shape="circle"
              @click="currentPlayingIndex === index ? stopAudio() : playMessageAudio(index, message.content)"
            >
              <t-icon :name="currentPlayingIndex === index ? 'pause' : 'play'" />
            </t-button>
          </div>
        </div>
        
        <!-- 语音识别临时结果显示 -->
        <div v-if="recognizedText" class="message-item user recognition-result">
          <div class="message-header">
            <t-icon name="mic" />
            <span>语音识别结果</span>
          </div>
          <div class="message-content">{{ recognizedText }}</div>
        </div>
      </div>
      
      <div class="voice-control-section">
        <div class="speaker-selector">
          <div class="section-title">{{ $t('common.chat.speaker') }}</div>
          <t-popup trigger="click" overlayClassName="speaker-popup" placement="top-left" v-model:visible="speakerPopupVisible">
            <t-select 
              class="selector" 
              :value="selectedSpeaker?.name" 
              :placeholder="$t('common.chat.selectSpeaker')"
            ></t-select>
            <template #content>
              <div class="popup-scoped">
                <div class="side">{{ $t('common.chat.myVoice') }}</div>
                <div class="list">
                  <t-input class="list-search" v-model="speakerSearch" :placeholder="$t('common.chat.searchSpeaker')" @change="searchSpeakers">
                    <template #prefix-icon>
                      <t-icon name="search" />
                    </template>
                  </t-input>
                  <div class="list-box noscrollbar">
                    <div 
                      class="list-box__item" 
                      v-for="speaker in speakerList" 
                      :speaker-id="speaker.id" 
                      :key="speaker.id"
                      @click="selectSpeaker(speaker)" 
                      :class="{ '--active': selectedSpeaker?.id == speaker.id }"
                    >
                      <t-avatar class="avatar" :alt="speaker.name">{{ speaker.name.slice(0, 1) }}</t-avatar>
                      <div class="name" :title="speaker.name">{{ speaker.name }}</div>
                      <t-image class="btn" v-if="playingId !== speaker.id" :src="playIcon" @click.stop="handlePlay(speaker)" />
                      <t-image class="btn" v-else :src="pauseIcon" @click.stop="handlePlay(speaker)" />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </t-popup>
        </div>
        
        <div class="voice-buttons">
          <t-button 
            class="voice-btn" 
            :class="{ 
              'recording': isRecording,
              'processing': isProcessing 
            }" 
            :disabled="isProcessing"
            @click="isRecording ? stopMediaRecordingAndProcess() : startMediaRecording()"
          >
            <div class="btn-content">
              <div class="mic-icon">
                <t-icon v-if="isRecording" name="stop" />
                <t-icon v-else-if="isProcessing" name="refresh" />
                <t-icon v-else name="mic" />
              </div>
              <span v-if="isRecording">{{ $t('common.chat.stopRecording') }}</span>
              <span v-else-if="isProcessing">处理中...</span>
              <span v-else>{{ $t('common.chat.startRecording') }}</span>
            </div>
          </t-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { modelPage, audition, sendChatMessage, startRecording, stopRecording, chatTextToSpeech, getContext, saveContext } from '@renderer/api'

const { t } = useI18n()
const router = useRouter()
const messages = ref([])
const messagesContainer = ref(null)
const persona = ref('')
const isRecording = ref(false)
const isProcessing = ref(false)
const processingStatus = ref('正在识别语音...')
const recognizedText = ref('')
const speakerPopupVisible = ref(false)
const speakerSearch = ref('')
const speakerList = ref([])
const selectedSpeaker = ref(null)
const playingId = ref('')
const currentPlayingIndex = ref(-1)
const isAudioPlaying = ref(false)
const apiError = ref(false)
const apiErrorMessage = ref("API密钥错误：请在设置中配置正确的API密钥")
const apiKeyValue = ref('')
const audio = new Audio()
const sessionId = ref(Date.now().toString()) // 生成唯一会话ID

// 模拟图标路径
const playIcon = ref('')
const pauseIcon = ref('')

const mediaRecorder = ref(null)
const audioChunks = ref([])

onMounted(() => {
  searchSpeakers()
  
  audio.addEventListener('ended', () => {
    stopAudio()
  })
  
  audio.addEventListener('play', () => {
    isAudioPlaying.value = true
  })
  
  audio.addEventListener('pause', () => {
    isAudioPlaying.value = false
  })
  
  // 加载时检查API密钥
  checkApiKey()
})

// 检查API密钥
const checkApiKey = async () => {
  try {
    const result = await getContext('deepseekApiKey')
    if (result && result.val) {
      apiKeyValue.value = result.val
    } else {
      apiError.value = true
      apiErrorMessage.value = "API密钥未配置：请在设置中配置API密钥"
    }
  } catch (error) {
    console.error('获取API密钥失败:', error)
    apiError.value = true
    apiErrorMessage.value = "获取API密钥失败：" + error.message
  }
}

// 跳转到设置页面
const goToSettings = () => {
  router.push('/settings')
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const searchSpeakers = async () => {
  try {
    const result = await modelPage({
      name: speakerSearch.value,
      page: 1,
      pageSize: 100
    })
    speakerList.value = result.list || []
  } catch (err) {
    console.error(t('common.chat.speakerSearchFailed'), err)
    speakerList.value = []
  }
}

const selectSpeaker = (speaker) => {
  selectedSpeaker.value = speaker
  speakerPopupVisible.value = false
}

const stopAudio = () => {
  audio.pause()
  audio.currentTime = 0
  playingId.value = ''
  currentPlayingIndex.value = -1
  isAudioPlaying.value = false
}

const playAudio = (speaker) => {
  audio.src = speaker.audio_path
  playingId.value = speaker.id
  audio.play()
}

const handlePlay = (speaker) => {
  if (playingId.value === speaker.id) {
    stopAudio()
  } else {
    if (!speaker.audio_path) {
      console.error(t('common.chat.audioPathNotFound', { name: speaker.name }))
      return
    }
    playAudio(speaker)
  }
}

const playMessageAudio = async (messageIndex, text) => {
  if (!selectedSpeaker.value) return
  
  // 如果当前正在播放，先停止
  if (currentPlayingIndex.value !== -1) {
    stopAudio()
  }
  
  await playResponseAudio(messageIndex, text)
}

const playResponseAudio = async (messageIndex, text) => {
  if (!selectedSpeaker.value) return
  
  try {
    // 调用文本转语音API
    const audioUrl = await chatTextToSpeech(selectedSpeaker.value.id, text)
    currentPlayingIndex.value = messageIndex
    
    audio.src = audioUrl
    audio.onended = () => {
      currentPlayingIndex.value = -1
      isAudioPlaying.value = false
    }
    audio.play()
    isAudioPlaying.value = true
  } catch (error) {
    console.error(t('common.chat.synthesisAudioFailed'), error)
    currentPlayingIndex.value = -1
    isAudioPlaying.value = false
  }
}

async function startMediaRecording() {
  try {
    // 清除之前的识别结果
    recognizedText.value = ''
    
    // 获取媒体流
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // 创建MediaRecorder实例
    mediaRecorder.value = new MediaRecorder(stream)
    audioChunks.value = []
    
    // 收集录音数据
    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }
    
    // 开始录音
    mediaRecorder.value.start()
    isRecording.value = true
  } catch (error) {
    console.error('开始录音失败:', error)
    isRecording.value = false
  }
}

async function stopMediaRecordingAndProcess() {
  if (mediaRecorder.value && isRecording.value) {
    // 改变状态为处理中
    isRecording.value = false
    isProcessing.value = true
    processingStatus.value = '正在识别语音...'
    
    // 创建一个新的Promise，当录音停止时解析
    const recordingData = await new Promise(resolve => {
      mediaRecorder.value.onstop = async () => {
        // 将录音数据合并为blob
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/wav' })
        
        // 将blob转换为ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer()
        resolve(Array.from(new Uint8Array(arrayBuffer)))
        
        // 停止所有音轨
        mediaRecorder.value.stream.getTracks().forEach(track => track.stop())
      }
      mediaRecorder.value.stop()
    })
    
    // 通过IPC发送给主进程处理
    const result = await window.electron.ipcRenderer.invoke('chat/processAudio', recordingData)
    
    // 处理识别结果
    if (result && result.success && result.text) {
      // 先显示识别结果
      recognizedText.value = result.text
      
      // 滚动到底部
      await nextTick()
      scrollToBottom()
      
      // 更新处理状态
      processingStatus.value = '正在发送消息给AI...'
      
      // 发送消息给DeepSeek并获取回复
      try {
        // 检查是否配置了API密钥
        if (!apiKeyValue.value) {
          throw new Error("API密钥未配置，请先在设置中配置API密钥")
        }
        
        // 将识别到的文本添加到消息列表，并清除临时显示
        messages.value.push({
          role: 'user',
          content: result.text
        })
        recognizedText.value = ''
        
        await nextTick()
        scrollToBottom()
        
        const responseText = await sendChatMessage(sessionId.value, result.text, persona.value)
        
        // 添加AI回复
        messages.value.push({
          role: 'assistant',
          content: responseText
        })
        
        await nextTick()
        scrollToBottom()
        
        // 如果选择了音色，则自动播放合成语音
        if (selectedSpeaker.value) {
          playResponseAudio(messages.value.length - 1, responseText)
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        
        // 检查错误类型
        if (error.message && error.message.includes('401')) {
          apiError.value = true
          apiErrorMessage.value = "API认证失败(401)：API密钥无效或已过期"
        } else if (error.message && error.message.includes('API key')) {
          apiError.value = true
          apiErrorMessage.value = "API密钥错误：" + error.message
        }
        
        // 显示错误消息
        messages.value.push({
          role: 'assistant',
          content: `错误: ${error.message || '消息发送失败'}`
        })
        
        await nextTick()
        scrollToBottom()
      }
    } else {
      // 语音识别失败
      messages.value.push({
        role: 'assistant',
        content: '语音识别失败，请重试'
      })
      
      await nextTick()
      scrollToBottom()
    }
    
    // 重置处理状态
    isProcessing.value = false
    mediaRecorder.value = null
  }
}
</script>

<style lang="less" scoped>
.chat-content-box {
  height: calc(100vh - 60px);
  padding: 20px;
  background-color: #f4f4f6;
  overflow: auto;
  
  h1 {
    font-size: 24px;
    margin-bottom: 20px;
    color: #000000;
    font-weight: 500;
  }
  
  .chat-container {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    height: calc(100% - 60px);
    position: relative;
    
    .api-error-alert, .api-key-status {
      margin-bottom: 15px;
    }
    
    .persona-section {
      margin-bottom: 15px;
      
      .section-title {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 8px;
        color: #000000;
      }
      
      .persona-input {
        width: 100%;
        height: 80px;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px 15px;
        font-size: 14px;
        resize: none;
        
        &:focus {
          border-color: #434AF9;
          outline: none;
        }
      }
    }
    
    .audio-status-indicator, .processing-status-indicator {
      position: fixed;
      top: 60px;
      right: 20px;
      padding: 10px 15px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      z-index: 100;
      font-weight: 500;
    }
    
    .audio-status-indicator {
      background: rgba(67, 74, 249, 0.9);
      color: white;
      
      .ai-speaking-icon {
        position: relative;
        margin-right: 8px;
        
        .wave-circle {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          animation: pulse-wave 1.5s infinite;
        }
      }
    }
    
    .processing-status-indicator {
      background: rgba(255, 152, 0, 0.9);
      color: white;
      
      .processing-icon {
        margin-right: 8px;
      }
    }
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #f2f2f4;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      background-color: #fafafa;
      
      .empty-message {
        color: #9097a5;
        font-size: 14px;
        text-align: center;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .message-item {
        margin-bottom: 15px;
        padding: 10px 15px;
        border-radius: 8px;
        max-width: 80%;
        
        &.user {
          background-color: #e1f5fe;
          margin-left: auto;
          color: #333333;
          font-weight: 500;
        }
        
        &.assistant {
          background-color: #f5f5f5;
          margin-right: auto;
          color: #333333;
          
          .audio-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            
            .audio-wave {
              display: flex;
              align-items: flex-end;
              height: 20px;
              
              .wave-bar {
                width: 3px;
                height: 4px;
                margin: 0 2px;
                background-color: #666;
                border-radius: 1px;
                transition: height 0.2s ease;
              }
              
              &.playing {
                .wave-bar {
                  animation: sound 0.5s infinite alternate;
                  
                  &:nth-child(1) { animation-delay: 0.0s; }
                  &:nth-child(2) { animation-delay: 0.1s; }
                  &:nth-child(3) { animation-delay: 0.2s; }
                  &:nth-child(4) { animation-delay: 0.1s; }
                  &:nth-child(5) { animation-delay: 0.0s; }
                }
              }
            }
            
            .play-btn {
              margin-left: 8px;
              width: 28px;
              height: 28px;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          }
        }
        
        &.recognition-result {
          background-color: #fff3e0;
          border: 1px dashed #ffb74d;
          
          .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
            color: #f57c00;
            font-size: 12px;
            
            .t-icon {
              margin-right: 4px;
            }
          }
        }
      }
    }
    
    .voice-control-section {
      display: flex;
      margin-bottom: 15px;
      
      .speaker-selector {
        flex: 1;
        margin-right: 15px;
        
        .section-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #000000;
        }
        
        .selector {
          width: 100%;
        }
      }
      
      .voice-buttons {
        display: flex;
        justify-content: flex-end;
        align-items: flex-end;
        
        .voice-btn {
          height: 40px;
          min-width: 100px;
          background-color: #434AF9;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 0 15px;
          cursor: pointer;
          font-size: 14px;
          
          &.recording {
            background-color: #f44336;
            animation: pulse 1.5s infinite;
          }
          
          &.processing {
            background-color: #ff9800;
            
            .mic-icon {
              animation: spin 1.5s infinite linear;
            }
          }
          
          &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          
          .btn-content {
            display: flex;
            align-items: center;
            justify-content: center;
            
            .mic-icon {
              margin-right: 8px;
            }
          }
          
          &:hover:not(:disabled) {
            background-color: #5f64fd;
            
            &.recording {
              background-color: #d32f2f;
            }
            
            &.processing {
              background-color: #f57c00;
            }
          }
        }
      }
    }
  }
}

/* 弹出菜单样式修改 */
:deep(.popup-scoped) {
  .side {
    color: #f0f0f0 !important; /* 修改白色文字为更明显的颜色 */
    background-color: #2c2e33 !important; /* 加深背景 */
  }
  
  .list-box__item {
    .name {
      color: #f0f0f0 !important; /* 修改白色文字为更明显的颜色 */
      font-weight: 600 !important;
    }
    
    background: #2c2e33 !important; /* 加深背景 */
    
    &.--active {
      border: 2px solid #5f64fd !important; /* 使选中更明显 */
      background: #383a40 !important;
    }
  }
  
  background-color: #222326 !important; /* 加深整体背景 */
}

@keyframes sound {
  0% {
    height: 4px;
  }
  100% {
    height: 16px;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
}

@keyframes pulse-wave {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.4;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.noscrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
</style> 