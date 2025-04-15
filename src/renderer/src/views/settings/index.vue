<template>
  <div class="settings-content-box">
    <h1>{{ $t('common.setting.title') }}</h1>
    <div class="settings-form">
      <div class="form-item">
        <div class="label">{{ $t('common.setting.enableRemoteServer') }}</div>
        <div class="switch-container">
          <t-switch v-model="remoteEnabled" @change="toggleRemoteServer" />
        </div>
      </div>
      <div class="form-item">
        <div class="label">{{ $t('common.setting.serverIP') }}</div>
        <input 
          type="text" 
          v-model="serverIP" 
          :placeholder="$t('common.setting.serverIPPlaceholder')"
          @change="saveServerIP"
          :disabled="!remoteEnabled"
          :class="{'disabled-input': !remoteEnabled}"
        />
        <div class="tip">{{ $t('common.setting.serverIPTip') }}</div>
      </div>
      <div class="form-item">
        <div class="label">{{ $t('common.setting.deepseekApiKey') }}</div>
        <input 
          type="password" 
          v-model="deepseekApiKey" 
          :placeholder="$t('common.setting.deepseekApiKeyPlaceholder')"
          @change="saveDeepseekApiKey"
        />
        <div class="tip">{{ $t('common.setting.deepseekApiKeyTip') }}</div>
      </div>
      <div class="form-item">
        <button class="save-btn" @click="saveAll">{{ $t('common.setting.save') }}</button>
        <button class="reset-btn" @click="resetAll">{{ $t('common.setting.reset') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessagePlugin } from 'tdesign-vue-next'

const { t } = useI18n()
const serverIP = ref('')
const remoteEnabled = ref(true)
const deepseekApiKey = ref('')

onMounted(async () => {
  // 获取当前的服务器配置
  try {
    const config = await window.electron.ipcRenderer.invoke('get-server-config')
    if (config) {
      // 设置远程服务器启用状态
      remoteEnabled.value = config.enabled !== false
      
      // 设置服务器地址
      if (config.serverAddress) {
        // 移除http://前缀
        serverIP.value = config.serverAddress.replace(/^https?:\/\//, '')
      }
      
      // 设置 Deepseek API Key
      if (config.deepseekApiKey) {
        deepseekApiKey.value = config.deepseekApiKey
      }
    }
  } catch (error) {
    console.error('获取服务器配置失败:', error)
  }
})

const toggleRemoteServer = async () => {
  try {
    await window.electron.ipcRenderer.invoke('update-server-config', { 
      enabled: remoteEnabled.value 
    })
    
    // 如果关闭远程服务，则恢复使用本地地址
    if (!remoteEnabled.value) {
      serverIP.value = '127.0.0.1'
      await window.electron.ipcRenderer.invoke('update-server-config', { 
        serverAddress: 'http://127.0.0.1' 
      })
    }
  } catch (error) {
    console.error('更新远程服务器状态失败:', error)
  }
}

const saveServerIP = async () => {
  // 如果远程服务未启用，不执行保存
  if (!remoteEnabled.value) return
  
  try {
    // 确保服务器地址包含http://前缀
    let address = serverIP.value.trim()
    if (address && !address.startsWith('http://') && !address.startsWith('https://')) {
      address = `http://${address}`
    }
    
    await window.electron.ipcRenderer.invoke('update-server-config', { serverAddress: address })
    alert(t('common.setting.saveSuccess'))
  } catch (error) {
    console.error('保存服务器配置失败:', error)
    alert(t('common.setting.saveFailed'))
  }
}

const saveDeepseekApiKey = async () => {
  try {
    await window.electron.ipcRenderer.invoke('update-server-config', { 
      deepseekApiKey: deepseekApiKey.value 
    })
    MessagePlugin.success(t('common.setting.saveApiKeySuccess'))
  } catch (error) {
    console.error('保存 API Key 失败:', error)
    MessagePlugin.error(t('common.setting.saveApiKeyFailed'))
  }
}

const saveAll = async () => {
  try {
    await window.electron.ipcRenderer.invoke('update-server-config', {
      enabled: remoteEnabled.value,
      serverAddress: serverIP.value.startsWith('http') ? serverIP.value : `http://${serverIP.value}`,
      deepseekApiKey: deepseekApiKey.value
    })
    MessagePlugin.success(t('common.setting.saveSuccess'))
  } catch (error) {
    console.error('保存配置失败:', error)
    MessagePlugin.error(t('common.setting.saveFailed'))
  }
}

const resetAll = async () => {
  try {
    serverIP.value = '127.0.0.1'
    deepseekApiKey.value = ''
    await window.electron.ipcRenderer.invoke('update-server-config', { 
      serverAddress: 'http://127.0.0.1',
      deepseekApiKey: ''
    })
    MessagePlugin.success(t('common.setting.resetSuccess'))
  } catch (error) {
    console.error('重置配置失败:', error)
    MessagePlugin.error(t('common.setting.resetFailed'))
  }
}
</script>

<style lang="less" scoped>
.settings-content-box {
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
  
  .settings-form {
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    
    .form-item {
      margin-bottom: 20px;
      
      .label {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 8px;
        color: #000000;
      }
      
      .switch-container {
        margin-bottom: 10px;
      }
      
      input {
        width: 100%;
        height: 40px;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 0 10px;
        font-size: 14px;
        color: #000000;
        
        &:focus {
          border-color: #434AF9;
          outline: none;
        }
        
        &.disabled-input {
          background-color: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
      }
      
      .tip {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }
      
      .save-btn {
        background-color: #434AF9;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        margin-right: 10px;
        
        &:hover {
          background-color: #3439db;
        }
        
        &:disabled {
          background-color: #a0a0a0;
          cursor: not-allowed;
        }
      }
      
      .reset-btn {
        background-color: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        
        &:hover {
          background-color: #e6e6e6;
        }
        
        &:disabled {
          background-color: #f5f5f5;
          color: #a0a0a0;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style> 