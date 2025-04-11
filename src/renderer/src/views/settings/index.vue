<template>
  <div class="settings-content-box">
    <h1>{{ $t('common.setting.title') }}</h1>
    <div class="settings-form">
      <div class="form-item">
        <div class="label">{{ $t('common.setting.serverIP') }}</div>
        <input 
          type="text" 
          v-model="serverIP" 
          :placeholder="$t('common.setting.serverIPPlaceholder')"
          @change="saveServerIP"
        />
        <div class="tip">{{ $t('common.setting.serverIPTip') }}</div>
      </div>
      <div class="form-item">
        <button class="save-btn" @click="saveServerIP">{{ $t('common.setting.save') }}</button>
        <button class="reset-btn" @click="resetServerIP">{{ $t('common.setting.reset') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const serverIP = ref('')

onMounted(async () => {
  // 获取当前的服务器IP设置
  try {
    const config = await window.electron.ipcRenderer.invoke('get-server-config')
    if (config && config.serverAddress) {
      // 移除http://前缀
      serverIP.value = config.serverAddress.replace(/^https?:\/\//, '')
    }
  } catch (error) {
    console.error('获取服务器配置失败:', error)
  }
})

const saveServerIP = async () => {
  try {
    // 确保服务器地址包含http://前缀
    let address = serverIP.value.trim()
    if (address && !address.startsWith('http://') && !address.startsWith('https://')) {
      address = `http://${address}`
    }
    
    await window.electron.ipcRenderer.invoke('update-server-config', { serverAddress: address })
    alert(t('settings.saveSuccess'))
  } catch (error) {
    console.error('保存服务器配置失败:', error)
    alert(t('settings.saveFailed'))
  }
}

const resetServerIP = async () => {
  serverIP.value = '127.0.0.1'
  try {
    await window.electron.ipcRenderer.invoke('update-server-config', { serverAddress: 'http://127.0.0.1' })
    alert(t('settings.resetSuccess'))
  } catch (error) {
    console.error('重置服务器配置失败:', error)
    alert(t('settings.resetFailed'))
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
      }
    }
  }
}
</style> 