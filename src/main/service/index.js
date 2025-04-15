import { init as videoResult } from './video.js'
import { init as model } from './model.js'
import { init as context } from './context.js'
import { init as voice } from './voice.js'
// import { init as chat } from './chat.js'  // 先注释掉
import { registerServerConfigHandlers } from './server-config.js'

export function registerHandler() {
  videoResult()
  model()
  context()
  voice()
  // chat()  // 先注释掉
  registerServerConfigHandlers()
}
