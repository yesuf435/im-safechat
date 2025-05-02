const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

// 路由引入（只保留一次）
const setupSocket = require('./socket');
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const messageRoutes = require('./routes/messageRoutes');
const superSecretRoutes = require('./routes/superSecretRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sessionRoutes = require('./routes/sessionRoutes');

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 文件上传
const allowedTypes = ['image/jpeg', 'image/png', 'audio/mpeg'];
const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) return cb(new Error('File type not allowed'));
    cb(null, true);
  }
});
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}`, type: req.file.mimetype });
});

// 路由挂载
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
if (process.env.ENABLE_BOSS === 'true') {
  app.use('/superpanel', superSecretRoutes);
}

// socket
setupSocket(io);

// 启动服务
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ IM 后端已启动，监听端口 ${PORT}`);
});
