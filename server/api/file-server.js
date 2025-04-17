const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const app = express()
const port = process.env.FILE_SERVER_PORT || 3001

// 定义服务类型对应的数据目录映射
const SERVICE_PATHS = {
  'tts': '/code/data/tts',               // 对应 ~/heygem_data/voice/data:/code/data
  'face2face': '/code/data',         // 对应 ~/heygem_data/face2face:/code/data
  'default': '/code/data'                   // 默认保存路径
}

// 先解析普通表单字段
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 创建一个特殊的multer实例，用于处理文件上传
const fileUpload = multer({ 
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // 从请求头中获取服务类型和目标路径
      console.log('req header',req.headers)
      const serviceType = req.headers['x-service-type'] || 'default'
      const targetPath = req.headers['x-target-path'] || ''
      
      // 根据服务类型选择基础路径
      const basePath = SERVICE_PATHS[serviceType] || SERVICE_PATHS.default
      const uploadPath = path.join(basePath, targetPath)
      console.log('req body',req.body)
      console.log(`From header: serviceType=${serviceType}, targetPath=${targetPath}`)
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
}).single('file');

// 文件上传接口
app.post('/upload', (req, res) => {
  // 手动调用multer中间件，确保body字段已经解析
  fileUpload(req, res, function(err) {
    if (err) {
      // 处理错误
      return res.status(500).json({ error: err.message })
    }
    
    // 正常处理请求
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
  });
});

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

// 文件复制接口
app.post('/copy', (req, res) => {
  try {
    const { sourcePath, serviceType, targetPath } = req.body
    
    if (!sourcePath) {
      return res.status(400).json({ error: 'Source path not specified' })
    }
    
    // 验证源文件存在
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Source file does not exist' })
    }
    
    // 根据服务类型选择基础路径
    const basePath = SERVICE_PATHS[serviceType] || SERVICE_PATHS.default
    const fullTargetPath = path.join(basePath, targetPath)
    
    // 确保目标目录存在
    if (!fs.existsSync(path.dirname(fullTargetPath))) {
      fs.mkdirSync(path.dirname(fullTargetPath), { recursive: true })
    }
    
    // 获取文件名
    const fileName = path.basename(sourcePath)
    const destPath = path.join(fullTargetPath, fileName)
    
    // 执行复制操作
    fs.copyFileSync(sourcePath, destPath)
    console.log(`File copied from ${sourcePath} to ${destPath}`)
    
    res.json({
      success: true,
      sourcePath: sourcePath,
      targetPath: destPath,
      message: 'File copied successfully'
    })
  } catch (error) {
    console.error('File copy error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.listen(port, '0.0.0.0', () => {
  console.log(`File server running on port ${port}`)
}) 