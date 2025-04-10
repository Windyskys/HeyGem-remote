const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const app = express()
const port = process.env.FILE_SERVER_PORT || 3001

// 定义服务类型对应的数据目录映射
const SERVICE_PATHS = {
  'tts': '~/heygem_data/voice/data',               // 对应 ~/heygem_data/voice/data:/code/data
  'face2face': '~/heygem_data/face2face',         // 对应 ~/heygem_data/face2face:/code/data
  // 'default': '/code/data'            // 默认保存路径
  // 'tts': '/code/data',                      // 容器内部路径
  // 'face2face': '/code/data/face2face',      // 容器内部路径
  'default': '/code/data'                   // 默认保存路径
}

// 配置文件存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const serviceType = req.body.serviceType || 'default'
    const targetPath = req.body.targetPath || ''
    
    // 根据服务类型选择基础路径
    const basePath = SERVICE_PATHS[serviceType] || SERVICE_PATHS.default
    const uploadPath = path.join(basePath, targetPath)
    
    console.log(`Saving file to: ${uploadPath} (Service type: ${serviceType})`)
    
    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage: storage })

// 文件上传接口
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    
    const filePath = req.file.path
    console.log('File uploaded:', filePath)
    
    res.json({
      success: true,
      filePath: filePath,
      message: 'File uploaded successfully'
    })
  } catch (error) {
    console.error('File upload error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// 文件下载接口
app.get('/download', (req, res) => {
  try {
    const filePath = req.query.filePath
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path not specified' })
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File does not exist' })
    }
    
    res.download(filePath)
  } catch (error) {
    console.error('File download error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`File server running on port ${port}`)
}) 