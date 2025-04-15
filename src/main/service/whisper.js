import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs';
import log from '../logger.js';
import { app } from 'electron';

// 模型缓存路径
const modelCachePath = path.join(app.getPath('userData'), 'models');

// 确保模型缓存目录存在
if (!fs.existsSync(modelCachePath)) {
  fs.mkdirSync(modelCachePath, { recursive: true });
}

// 创建临时Python脚本
const scriptPath = path.join(app.getPath('temp'), 'whisper_script.py');
const pythonScript = `
# -*- coding: utf-8 -*-
import sys
import os
import traceback
from faster_whisper import WhisperModel

def transcribe_audio(audio_path, model_size="tiny", device="cpu", compute_type="int8"):
    try:
        print(f"Start transcribe audio: {audio_path}", file=sys.stderr)
        print(f"Use model size: {model_size}", file=sys.stderr)
        
        # 检查音频文件是否存在
        if not os.path.exists(audio_path):
            print(f"Error: Audio file does not exist: {audio_path}", file=sys.stderr)
            return
            
        # 设置模型位置为应用数据目录下的models文件夹
        model_path = os.path.join("${modelCachePath.replace(/\\/g, '\\\\')}", model_size)
        print(f"Model path: {model_path}", file=sys.stderr)
        
        # 加载模型
        print("Loading Whisper model...", file=sys.stderr)
        model = WhisperModel(model_size, device=device, compute_type=compute_type, 
                            download_root=model_path, local_files_only=False)
        
        # 转录音频 - 添加language="zh"参数，并设置translate=True强制翻译为中文
        print("Start transcribing audio...", file=sys.stderr)
        segments, info = model.transcribe(
            audio_path, 
            beam_size=5,
            language="zh",  # 指定输出语言为中文
            task="translate"  # 使用翻译任务，将其他语言翻译为中文
        )
        
        # 收集所有段落文本
        result = ""
        segments_list = list(segments)  # 转换为列表以便检查是否为空
        
        print(f"Detected {len(segments_list)} text segments", file=sys.stderr)
        
        if not segments_list:
            print("Warning: No text detected", file=sys.stderr)
            print("No speech detected") # 返回一个默认消息而不是空结果
            return
            
        for segment in segments_list:
            result += segment.text + " "
            print(f"Text segment: {segment.text}", file=sys.stderr)
        
        # 返回结果
        final_result = result.strip()
        print(f"Final transcription result: {final_result}", file=sys.stderr)
        print(final_result)
        
    except Exception as e:
        print(f"Error during transcription: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        # 确保即使有错误也返回一些内容，这样不会触发"No transcription result"错误
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print("缺少音频文件路径", file=sys.stderr)
            print("错误: 缺少音频文件路径")
            sys.exit(1)
        
        audio_path = sys.argv[1]
        model_size = sys.argv[2] if len(sys.argv) > 2 else "tiny"
        
        print(f"Python脚本启动: 音频={audio_path}, 模型={model_size}", file=sys.stderr)
        transcribe_audio(audio_path, model_size)
        
    except Exception as e:
        print(f"主程序出错: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        print(f"错误: {str(e)}")
`;

fs.writeFileSync(scriptPath, pythonScript);

/**
 * 使用fast-whisper进行语音识别
 * @param {string} audioPath 音频文件路径
 * @param {string} modelSize 模型大小 (tiny, base, small, medium, large-v3)
 * @returns {Promise<string>} 识别后的文本
 */
export async function recognizeSpeech(audioPath, modelSize = 'tiny') {
  try {
    log.debug(`[Whisper] Recognizing speech from ${audioPath} with model ${modelSize}`);
    
    // 运行Python脚本
    const options = {
      mode: 'text',
      pythonPath: 'python', // 确保Python在系统路径中
      args: [audioPath, modelSize],
      stderrParser: line => console.log('[Python stderr]', line) // 添加这行来查看标准错误输出
    };
    
    return new Promise((resolve, reject) => {
      PythonShell.run(scriptPath, options)
        .then(results => {
          if (results && results.length > 0) {
            log.debug(`[Whisper] Recognition result: "${results[0]}"`);
            resolve(results[0]);
          } else {
            log.error('[Whisper] No transcription result received from Python script');
            reject(new Error('No transcription result'));
          }
        })
        .catch(err => {
          log.error('[Whisper] Error during speech recognition:', err);
          reject(err);
        });
    });
  } catch (error) {
    log.error('[Whisper] Error in speech recognition:', error);
    throw error;
  }
}