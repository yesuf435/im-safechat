// 聊天媒体功能实现

// 1. 表情发送功能
app.post('/api/messages/emoji', authMiddleware, async (req, res) => {
  const { receiverId, emojiCode, messageType } = req.body;
  const senderId = req.user.id;
  
  if (!receiverId || !emojiCode) {
    return res.status(400).json({ message: '接收者ID和表情代码不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('发送表情:', { senderId, receiverId, emojiCode, messageType });
    
    // 检查用户是否存在
    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiverId]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查是否是好友关系（如果是私聊）
    if (messageType === 'private') {
      const [friendRows] = await pool.execute(
        'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
        [senderId, receiverId]
      );
      
      if (friendRows.length === 0) {
        return res.status(403).json({ message: '你们不是好友，无法发送消息' });
      }
      
      // 发送表情消息
      await pool.execute(
        'INSERT INTO private_messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, "emoji")',
        [senderId, receiverId, emojiCode]
      );
    } else if (messageType === 'group') {
      // 检查群组是否存在
      const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [receiverId]);
      
      if (groupRows.length === 0) {
        return res.status(404).json({ message: '群组不存在' });
      }
      
      // 检查是否是群成员
      const [memberRows] = await pool.execute(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [receiverId, senderId]
      );
      
      if (memberRows.length === 0) {
        return res.status(403).json({ message: '你不是该群成员，无法发送消息' });
      }
      
      // 发送群组表情消息
      await pool.execute(
        'INSERT INTO group_messages (group_id, sender_id, content, message_type) VALUES (?, ?, ?, "emoji")',
        [receiverId, senderId, emojiCode]
      );
    } else {
      return res.status(400).json({ message: '消息类型无效' });
    }
    
    res.status(201).json({ message: '表情已发送' });
  } catch (error) {
    console.error('发送表情失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 2. 图片上传和发送功能
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../frontend/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只接受图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 创建上传中间件
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// 图片上传API
app.post('/api/upload/image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '没有上传文件或文件类型不正确' });
    }
    
    // 返回文件路径
    const filePath = `/uploads/${req.file.filename}`;
    
    res.status(201).json({ 
      message: '图片上传成功',
      filePath: filePath
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 发送图片消息API
app.post('/api/messages/image', authMiddleware, async (req, res) => {
  const { receiverId, imagePath, messageType } = req.body;
  const senderId = req.user.id;
  
  if (!receiverId || !imagePath) {
    return res.status(400).json({ message: '接收者ID和图片路径不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('发送图片:', { senderId, receiverId, imagePath, messageType });
    
    // 检查用户是否存在
    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiverId]);
    
    if (userRows.length === 0 && messageType === 'private') {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查是否是好友关系（如果是私聊）
    if (messageType === 'private') {
      const [friendRows] = await pool.execute(
        'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
        [senderId, receiverId]
      );
      
      if (friendRows.length === 0) {
        return res.status(403).json({ message: '你们不是好友，无法发送消息' });
      }
      
      // 发送图片消息
      await pool.execute(
        'INSERT INTO private_messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, "image")',
        [senderId, receiverId, imagePath]
      );
    } else if (messageType === 'group') {
      // 检查群组是否存在
      const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [receiverId]);
      
      if (groupRows.length === 0) {
        return res.status(404).json({ message: '群组不存在' });
      }
      
      // 检查是否是群成员
      const [memberRows] = await pool.execute(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [receiverId, senderId]
      );
      
      if (memberRows.length === 0) {
        return res.status(403).json({ message: '你不是该群成员，无法发送消息' });
      }
      
      // 发送群组图片消息
      await pool.execute(
        'INSERT INTO group_messages (group_id, sender_id, content, message_type) VALUES (?, ?, ?, "image")',
        [receiverId, senderId, imagePath]
      );
    } else {
      return res.status(400).json({ message: '消息类型无效' });
    }
    
    res.status(201).json({ message: '图片消息已发送' });
  } catch (error) {
    console.error('发送图片消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 3. 语音消息功能
app.post('/api/upload/voice', authMiddleware, upload.single('voice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '没有上传文件或文件类型不正确' });
    }
    
    // 返回文件路径
    const filePath = `/uploads/${req.file.filename}`;
    
    res.status(201).json({ 
      message: '语音上传成功',
      filePath: filePath
    });
  } catch (error) {
    console.error('语音上传失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 发送语音消息API
app.post('/api/messages/voice', authMiddleware, async (req, res) => {
  const { receiverId, voicePath, duration, messageType } = req.body;
  const senderId = req.user.id;
  
  if (!receiverId || !voicePath) {
    return res.status(400).json({ message: '接收者ID和语音路径不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('发送语音:', { senderId, receiverId, voicePath, duration, messageType });
    
    // 构建语音消息内容（包含路径和时长）
    const content = JSON.stringify({ path: voicePath, duration: duration || 0 });
    
    // 检查用户是否存在
    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiverId]);
    
    if (userRows.length === 0 && messageType === 'private') {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查是否是好友关系（如果是私聊）
    if (messageType === 'private') {
      const [friendRows] = await pool.execute(
        'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
        [senderId, receiverId]
      );
      
      if (friendRows.length === 0) {
        return res.status(403).json({ message: '你们不是好友，无法发送消息' });
      }
      
      // 发送语音消息
      await pool.execute(
        'INSERT INTO private_messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, "voice")',
        [senderId, receiverId, content]
      );
    } else if (messageType === 'group') {
      // 检查群组是否存在
      const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [receiverId]);
      
      if (groupRows.length === 0) {
        return res.status(404).json({ message: '群组不存在' });
      }
      
      // 检查是否是群成员
      const [memberRows] = await pool.execute(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [receiverId, senderId]
      );
      
      if (memberRows.length === 0) {
        return res.status(403).json({ message: '你不是该群成员，无法发送消息' });
      }
      
      // 发送群组语音消息
      await pool.execute(
        'INSERT INTO group_messages (group_id, sender_id, content, message_type) VALUES (?, ?, ?, "voice")',
        [receiverId, senderId, content]
      );
    } else {
      return res.status(400).json({ message: '消息类型无效' });
    }
    
    res.status(201).json({ message: '语音消息已发送' });
  } catch (error) {
    console.error('发送语音消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 4. 文件分享功能
app.post('/api/upload/file', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '没有上传文件' });
    }
    
    // 返回文件路径
    const filePath = `/uploads/${req.file.filename}`;
    
    res.status(201).json({ 
      message: '文件上传成功',
      filePath: filePath,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 发送文件消息API
app.post('/api/messages/file', authMiddleware, async (req, res) => {
  const { receiverId, filePath, fileName, messageType } = req.body;
  const senderId = req.user.id;
  
  if (!receiverId || !filePath || !fileName) {
    return res.status(400).json({ message: '接收者ID、文件路径和文件名不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('发送文件:', { senderId, receiverId, filePath, fileName, messageType });
    
    // 构建文件消息内容
    const content = JSON.stringify({ path: filePath, name: fileName });
    
    // 检查用户是否存在
    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiverId]);
    
    if (userRows.length === 0 && messageType === 'private') {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查是否是好友关系（如果是私聊）
    if (messageType === 'private') {
      const [friendRows] = await pool.execute(
        'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
        [senderId, receiverId]
      );
      
      if (friendRows.length === 0) {
        return res.status(403).json({ message: '你们不是好友，无法发送消息' });
      }
      
      // 发送文件消息
      await pool.execute(
        'INSERT INTO private_messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, "file")',
        [senderId, receiverId, content]
      );
    } else if (messageType === 'group') {
      // 检查群组是否存在
      const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [receiverId]);
      
      if (groupRows.length === 0) {
        return res.status(404).json({ message: '群组不存在' });
      }
      
      // 检查是否是群成员
      const [memberRows] = await pool.execute(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [receiverId, senderId]
      );
      
      if (memberRows.length === 0) {
        return res.status(403).json({ message: '你不是该群成员，无法发送消息' });
      }
      
      // 发送群组文件消息
      await pool.execute(
        'INSERT INTO group_messages (group_id, sender_id, content, message_type) VALUES (?, ?, ?, "file")',
        [receiverId, senderId, content]
      );
    } else {
      return res.status(400).json({ message: '消息类型无效' });
    }
    
    res.status(201).json({ message: '文件消息已发送' });
  } catch (error) {
    console.error('发送文件消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});
