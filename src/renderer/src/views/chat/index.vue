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
          </div>
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
            :class="{ 'recording': isRecording }" 
            @click="toggleRecording"
          >
            <div class="btn-content">
              <div class="mic-icon">
                <t-icon name="mic" />
              </div>
              <span>{{ isRecording ? $t('common.chat.stopRecording') : $t('common.chat.startRecording') }}</span>
            </div>
          </t-button>
        </div>
      </div>
      
      <div class="chat-input-area">
        <input 
          type="text" 
          v-model="messageInput" 
          :placeholder="$t('common.chat.placeholder')"
          @keyup.enter="sendMessage"
        />
        <button class="send-btn" @click="sendMessage">{{ $t('common.chat.send') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { modelPage, audition } from '@renderer/api'

const { t } = useI18n()
const messageInput = ref('')
const messages = ref([])
const messagesContainer = ref(null)
const persona = ref('')
const isRecording = ref(false)
const speakerPopupVisible = ref(false)
const speakerSearch = ref('')
const speakerList = ref([])
const selectedSpeaker = ref(null)
const playingId = ref('')
const currentPlayingIndex = ref(-1)
const audio = new Audio()

// 模拟图标路径
const playIcon = ref('')
const pauseIcon = ref('')

onMounted(() => {
  searchSpeakers()
  
  audio.addEventListener('ended', () => {
    stopAudio()
  })
})

const sendMessage = async () => {
  if (messageInput.value.trim()) {
    // 添加用户消息
    messages.value.push({
      role: 'user',
      content: messageInput.value.trim()
    })
    
    const userInput = messageInput.value.trim()
    messageInput.value = ''
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
    
    // 模拟AI响应
    setTimeout(async () => {
      const responseText = `${t('common.chat.responsePrefix')} "${userInput}"。${t('common.chat.personaPrefix')}:${persona.value || t('common.chat.defaultPersona')}`
      
      // 添加AI回复
      messages.value.push({
        role: 'assistant',
        content: responseText
      })
      
      await nextTick()
      scrollToBottom()
      
      // 如果选择了音色，则播放合成语音
      if (selectedSpeaker.value) {
        playResponseAudio(messages.value.length - 1, responseText)
      }
    }, 1000)
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const toggleRecording = () => {
  isRecording.value = !isRecording.value
  
  if (isRecording.value) {
    // 开始录音的逻辑
    // window.electron.ipcRenderer.invoke('voice/startRecording')
  } else {
    // 停止录音并处理语音转文字的逻辑
    // const text = await window.electron.ipcRenderer.invoke('voice/stopRecording')
    // messageInput.value = text
    
    // 模拟语音识别结果
    setTimeout(() => {
      messageInput.value = t('common.chat.speechRecognitionResult')
    }, 1000)
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

const playResponseAudio = async (messageIndex, text) => {
  if (!selectedSpeaker.value) return
  
  try {
    // 调用文本转语音API
    const audioUrl = await audition(selectedSpeaker.value.id, text)
    currentPlayingIndex.value = messageIndex
    
    audio.src = audioUrl
    audio.onended = () => {
      currentPlayingIndex.value = -1
    }
    audio.play()
  } catch (error) {
    console.error(t('common.chat.synthesisAudioFailed'), error)
    currentPlayingIndex.value = -1
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
        }
        
        &.assistant {
          background-color: #f5f5f5;
          margin-right: auto;
          
          .audio-controls {
            display: flex;
            justify-content: flex-end;
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
          height: 50px;
          background-color: #434AF9;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 0 15px;
          cursor: pointer;
          
          &.recording {
            background-color: #f44336;
            animation: pulse 1.5s infinite;
          }
          
          .btn-content {
            display: flex;
            align-items: center;
            
            .mic-icon {
              margin-right: 8px;
            }
          }
          
          &:hover {
            background-color: #3439db;
          }
        }
      }
    }
    
    .chat-input-area {
      display: flex;
      height: 50px;
      
      input {
        flex: 1;
        height: 100%;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 0 15px;
        font-size: 14px;
        color: #000000;
        
        &:focus {
          border-color: #434AF9;
          outline: none;
        }
      }
      
      .send-btn {
        width: 100px;
        height: 100%;
        background-color: #434AF9;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        margin-left: 10px;
        
        &:hover {
          background-color: #3439db;
        }
      }
    }
  }
}

.popup-scoped {
  width: 300px;
  max-height: 400px;
  background-color: #1d1e20;
  border-radius: 8px;
  overflow: hidden;
  
  .side {
    padding: 10px 12px;
    font-size: 14px;
    color: #ffffff;
    background-color: #27292D;
  }
  
  .list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    &-search {
      flex: none;
      padding: 16px 12px;
    }
    
    &-box {
      flex: 1;
      overflow: auto;
      padding: 0 12px;
      max-height: 300px;
      
      &__item {
        width: 100%;
        height: 72px;
        background: #27292D;
        margin-bottom: 12px;
        border-radius: 4px;
        border: 1px solid transparent;
        padding: 0 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        
        &.--active {
          border: 1px solid #434AF9;
        }
        
        .avatar {
          flex: none;
          width: 40px;
          height: 40px;
        }
        
        .name {
          font-weight: 500;
          font-size: 14px;
          color: #FFFFFF;
          line-height: 22px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .btn {
          flex: none;
          margin-left: auto;
          cursor: pointer;
          width: 28px;
          height: 28px;
        }
      }
    }
  }
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

.noscrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
</style> 