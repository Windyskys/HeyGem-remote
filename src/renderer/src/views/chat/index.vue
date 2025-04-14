<template>
  <div class="chat-content-box">
    <h1>{{ $t('chat.title') }}</h1>
    <div class="chat-container">
      <div class="chat-messages">
        <div class="empty-message" v-if="messages.length === 0">
          {{ $t('chat.emptyText') }}
        </div>
        <!-- 这里将来会显示实际的聊天消息 -->
      </div>
      <div class="chat-input-area">
        <input 
          type="text" 
          v-model="messageInput" 
          :placeholder="$t('chat.placeholder')"
          @keyup.enter="sendMessage"
        />
        <button class="send-btn" @click="sendMessage">{{ $t('chat.send') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const messageInput = ref('')
const messages = ref([])

const sendMessage = () => {
  if (messageInput.value.trim()) {
    // 这里将来会处理消息发送逻辑
    // 现在暂时只清空输入框
    messageInput.value = ''
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
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #f2f2f4;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      background-color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .empty-message {
        color: #9097a5;
        font-size: 14px;
        text-align: center;
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
</style> 