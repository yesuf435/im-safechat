const express = require('express');
const http = require('http') ;
const cors = require('cors');
const { Server } = require('socket.io');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app) ;

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'fcim',
  password: process.env.DB_PASSWORD || 'MyNew@2025Safe',
  database: process.env.DB_NAME || 'chat_app'
};

// 用户存储
let users = {};

// Socket.io服务器
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// JWT密钥
const JWT_SECRET = 'your_jwt_secret';

// 数据库连接池
let pool;

// 初始化数据库连接
async function initDb() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('数据库连接成功');
    
    // 测试连接
    const connection = await pool.getConnection();
    connection.release();
    console.log('数据库连接测试成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
}

// 用户认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
};

// 注册API
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }
  
  try {
    // 检查用户是否已存在
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length > 0) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 加密密码
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    // 创建新用户
    await pool.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    
    res.status(201).json({ message: '注册成功' });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 登录API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }
  
  try {
    // 查询用户
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    const user = rows[0];
    
    // 验证密码
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    
    // 记录IP地址
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await pool.execute(
      'INSERT INTO ip_records (user_id, ip_address) VALUES (?, ?)',
      [user.id, ip]
    );
    
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户列表API
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username FROM users');
    res.json({ users: rows });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取群聊消息API
app.get('/api/group_messages/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM group_messages WHERE group_id = ? ORDER BY created_at DESC LIMIT 50',
      [groupId]
    );
    
    res.json({ messages: rows });
  } catch (error) {
    console.error('获取群聊消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 发送群聊消息API
app.post('/api/group_messages/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  const username = req.user.username;
  
  if (!content) {
    return res.status(400).json({ message: '消息内容不能为空' });
  }
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO group_messages (group_id, user_id, username, content) VALUES (?, ?, ?, ?)',
      [groupId, userId, username, content]
    );
    
    const message = {
      id: result.insertId,
      group_id: groupId,
      user_id: userId,
      username,
      content,
      created_at: new Date()
    };
    
    // 通过Socket.io广播消息
    io.emit('group_message', message);
    
    res.status(201).json({ message });
  } catch (error) {
    console.error('发送群聊消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log('用户连接', socket.id);

  // 登录
  socket.on('login', ({ username }) => {
    users[socket.id] = username;
    io.emit('userList', Object.values(users));
    socket.emit('loginSuccess', username);
  });

  // 发送消息
  socket.on('message', async (msg) => {
    const from = users[socket.id];
    if(!from) return; //未登录不允许发消息

    const message = { 
      user: from, 
      text: msg, 
      time: new Date().toISOString()
    };
    
    io.emit('message', message);
    
    // 可选：将消息保存到数据库
    try {
      // 假设用户ID为1，群组ID为1
      await pool.execute(
        'INSERT INTO group_messages (group_id, user_id, username, content) VALUES (?, ?, ?, ?)',
        [1, 1, from, msg]
      );
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('userList', Object.values(users));
    console.log('用户断开', socket.id);
  });
});

// 健康检查API
app.get('/health', (req, res) => res.send('IM服务正常运行'));

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`后端服务监听端口 ${PORT}`);
  await initDb();
});
// 好友系统API实现

// 搜索用户
// 创建群组
app.post('/api/groups', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  const creatorId = req.user.id;
  
  if (!name) {
    return res.status(400).json({ message: '群组名称不能为空' });
  }
  
  try {
    // 创建群组
    const [result] = await pool.execute(
      'INSERT INTO groups (name, creator_id, description) VALUES (?, ?, ?)',
      [name, creatorId, description || '']
    );
    
    const groupId = result.insertId;
    
    // 将创建者添加为群主
    await pool.execute(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, creatorId, 'owner']
    );
    
    res.status(201).json({ 
      message: '群组创建成功',
      group: {
        id: groupId,
        name,
        description: description || '',
        creator_id: creatorId
      }
    });
  } catch (error) {
    console.error('创建群组失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取群组列表
app.get('/api/groups', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 获取用户加入的群组
    const [rows] = await pool.execute(
      `SELECT g.id, g.name, g.description, g.created_at, gm.role,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    );
    
    res.json({ groups: rows });
  } catch (error) {
    console.error('获取群组列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取群组详情
app.get('/api/groups/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // 检查用户是否是群组成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '您不是该群组成员' });
    }
    
    // 获取群组信息
    const [groupRows] = await pool.execute(
      `SELECT g.id, g.name, g.description, g.creator_id, g.created_at,
              u.username as creator_name,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN users u ON g.creator_id = u.id
       WHERE g.id = ?`,
      [groupId]
    );
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    const group = groupRows[0];
    
    // 获取群组成员
    const [memberListRows] = await pool.execute(
      `SELECT gm.user_id, gm.role, gm.joined_at, u.username
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY FIELD(gm.role, 'owner', 'admin', 'member'), gm.joined_at`,
      [groupId]
    );
    
    res.json({
      group,
      members: memberListRows
    });
  } catch (error) {
    console.error('获取群组详情失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 邀请用户加入群组
app.post('/api/groups/:groupId/members', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  const inviterId = req.user.id;
  
  if (!userId) {
    return res.status(400).json({ message: '用户ID不能为空' });
  }
  
  try {
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    // 检查邀请者是否是群组成员
    const [inviterRows] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, inviterId]
    );
    
    if (inviterRows.length === 0) {
      return res.status(403).json({ message: '您不是该群组成员，无法邀请他人' });
    }
    
    // 检查被邀请者是否存在
    const [userRows] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [userId]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const user = userRows[0];
    
    // 检查被邀请者是否已经是群组成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length > 0) {
      return res.status(400).json({ message: '该用户已经是群组成员' });
    }
    
    // 检查邀请者和被邀请者是否是好友
    const [friendRows] = await pool.execute(
      'SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [inviterId, userId, userId, inviterId]
    );
    
    if (friendRows.length === 0) {
      return res.status(400).json({ message: '您与该用户不是好友，无法邀请' });
    }
    
    // 添加用户到群组
    await pool.execute(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, userId, 'member']
    );
    
    // 通过Socket.io通知被邀请者
    const userSocketId = Object.keys(users).find(key => users[key] === userId);
    if (userSocketId) {
      io.to(userSocketId).emit('group_invitation', {
        group_id: groupId,
        inviter_id: inviterId,
        inviter_name: req.user.username
      });
    }
    
    res.status(201).json({ message: `已成功邀请 ${user.username} 加入群组` });
  } catch (error) {
    console.error('邀请用户加入群组失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取群组成员
app.get('/api/groups/:groupId/members', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // 检查用户是否是群组成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '您不是该群组成员' });
    }
    
    // 获取群组成员
    const [rows] = await pool.execute(
      `SELECT gm.user_id, gm.role, gm.joined_at, u.username
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY FIELD(gm.role, 'owner', 'admin', 'member'), gm.joined_at`,
      [groupId]
    );
    
    res.json({ members: rows });
  } catch (error) {
    console.error('获取群组成员失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 退出群组
app.delete('/api/groups/:groupId/members/me', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // 检查用户是否是群组成员
    const [memberRows] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '您不是该群组成员' });
    }
    
    const role = memberRows[0].role;
    
    // 如果是群主，不允许直接退出
    if (role === 'owner') {
      return res.status(400).json({ message: '群主不能直接退出群组，请先转让群主身份' });
    }
    
    // 退出群组
    await pool.execute(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    res.json({ message: '已成功退出群组' });
  } catch (error) {
    console.error('退出群组失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 发送群组消息
app.post('/api/groups/:groupId/messages', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content) {
    return res.status(400).json({ message: '消息内容不能为空' });
  }
  
  try {
    // 检查用户是否是群组成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '您不是该群组成员，无法发送消息' });
    }
    
    // 发送消息
    const [result] = await pool.execute(
      'INSERT INTO group_messages (group_id, user_id, content) VALUES (?, ?, ?)',
      [groupId, userId, content]
    );
    
    const messageId = result.insertId;
    
    // 获取发送者信息
    const [userRows] = await pool.execute(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );
    
    const username = userRows[0].username;
    
    const message = {
      id: messageId,
      group_id: groupId,
      user_id: userId,
      username,
      content,
      created_at: new Date()
    };
    
    // 通过Socket.io广播消息
    io.emit('group_message', message);
    
    res.status(201).json({ message: message });
  } catch (error) {
    console.error('发送群组消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取群组消息
app.get('/api/groups/:groupId/messages', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // 检查用户是否是群组成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '您不是该群组成员，无法查看消息' });
    }
    
    // 获取群组消息
    const [rows] = await pool.execute(
      `SELECT gm.id, gm.group_id, gm.user_id, gm.content, gm.created_at, u.username
       FROM group_messages gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.created_at DESC
       LIMIT 50`,
      [groupId]
    );
    
    // 反转消息顺序，使最新的消息在底部
    const messages = rows.reverse();
    
    res.json({ messages });
  } catch (error) {
    console.error('获取群组消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});
// 修复好友系统API实现

// 1. 修复搜索用户API
app.get('/api/users/search', authMiddleware, async (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ message: '请提供用户名进行搜索' });
  }
  
  try {
    // 修改查询以确保更好的匹配结果
    const [rows] = await pool.execute(
      'SELECT id, username FROM users WHERE username LIKE ? AND id != ?',
      [`%${username}%`, req.user.id]
    );
    
    // 添加调试日志
    console.log('搜索用户结果:', rows);
    
    res.json({ users: rows });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 2. 修复发送好友请求API
app.post('/api/friend-requests', authMiddleware, async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;
  
  if (!receiverId) {
    return res.status(400).json({ message: '接收者ID不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('发送好友请求:', { senderId, receiverId });
    
    // 检查用户是否存在
    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiverId]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查是否已经是好友
    const [friendRows] = await pool.execute(
      'SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [senderId, receiverId, receiverId, senderId]
    );
    
    if (friendRows.length > 0) {
      return res.status(400).json({ message: '你们已经是好友了' });
    }
    
    // 检查是否已经发送过请求
    const [requestRows] = await pool.execute(
      'SELECT id, status FROM friend_requests WHERE sender_id = ? AND receiver_id = ?',
      [senderId, receiverId]
    );
    
    if (requestRows.length > 0) {
      const request = requestRows[0];
      
      if (request.status === 'pending') {
        return res.status(400).json({ message: '你已经发送过好友请求，等待对方接受' });
      } else if (request.status === 'rejected') {
        // 如果之前的请求被拒绝，允许重新发送
        await pool.execute(
          'UPDATE friend_requests SET status = "pending", updated_at = NOW() WHERE id = ?',
          [request.id]
        );
        
        return res.status(200).json({ message: '好友请求已重新发送' });
      }
    }
    
    // 检查对方是否已经向你发送请求
    const [reverseRequestRows] = await pool.execute(
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [receiverId, senderId]
    );
    
    if (reverseRequestRows.length > 0) {
      return res.status(400).json({ message: '对方已经向你发送了好友请求，请查看你的好友请求列表' });
    }
    
    // 发送好友请求
    await pool.execute(
      'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, "pending")',
      [senderId, receiverId]
    );
    
    res.status(201).json({ message: '好友请求已发送' });
  } catch (error) {
    console.error('发送好友请求失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 3. 修复获取好友请求API
app.get('/api/friend-requests', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 获取收到的好友请求
    const [receivedRows] = await pool.execute(
      `SELECT fr.id, fr.sender_id, fr.status, fr.created_at, fr.updated_at, u.username as sender_username
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    
    // 获取发送的好友请求
    const [sentRows] = await pool.execute(
      `SELECT fr.id, fr.receiver_id, fr.status, fr.created_at, fr.updated_at, u.username as receiver_username
       FROM friend_requests fr
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.sender_id = ?
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    
    // 添加调试日志
    console.log('获取好友请求:', { received: receivedRows, sent: sentRows });
    
    res.json({
      received: receivedRows,
      sent: sentRows
    });
  } catch (error) {
    console.error('获取好友请求失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 4. 修复处理好友请求API
app.put('/api/friend-requests/:requestId', authMiddleware, async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  
  if (!status || !['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: '状态无效，必须是 accepted 或 rejected' });
  }
  
  try {
    // 添加调试日志
    console.log('处理好友请求:', { requestId, status });
    
    // 检查请求是否存在且接收者是当前用户
    const [requestRows] = await pool.execute(
      'SELECT id, sender_id, receiver_id FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, userId]
    );
    
    if (requestRows.length === 0) {
      return res.status(404).json({ message: '好友请求不存在或已处理' });
    }
    
    const request = requestRows[0];
    
    // 更新请求状态
    await pool.execute(
      'UPDATE friend_requests SET status = ? WHERE id = ?',
      [status, requestId]
    );
    
    // 如果接受请求，添加好友关系
    if (status === 'accepted') {
      // 检查是否已经是好友
      const [friendRows] = await pool.execute(
        'SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [userId, request.sender_id, request.sender_id, userId]
      );
      
      if (friendRows.length === 0) {
        // 添加双向好友关系
        await pool.execute(
          'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
          [userId, request.sender_id]
        );
        
        await pool.execute(
          'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)',
          [request.sender_id, userId]
        );
      }
      
      res.json({ message: '已接受好友请求' });
    } else {
      res.json({ message: '已拒绝好友请求' });
    }
  } catch (error) {
    console.error('处理好友请求失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 5. 修复获取好友列表API
app.get('/api/friends', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 获取好友列表
    const [rows] = await pool.execute(
      `SELECT u.id, u.username
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = ?
       ORDER BY u.username`,
      [userId]
    );
    
    // 添加调试日志
    console.log('获取好友列表:', rows);
    
    res.json({ friends: rows });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 6. 修复删除好友API
app.delete('/api/friends/:friendId', authMiddleware, async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;
  
  try {
    // 添加调试日志
    console.log('删除好友:', { userId, friendId });
    
    // 检查是否是好友
    const [friendRows] = await pool.execute(
      'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    if (friendRows.length === 0) {
      return res.status(404).json({ message: '好友关系不存在' });
    }
    
    // 删除双向好友关系
    await pool.execute(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );
    
    res.json({ message: '好友已删除' });
  } catch (error) {
    console.error('删除好友失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});
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
// 增强群聊功能实现

// 1. 创建群聊功能增强
app.post('/api/groups/create', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  const creatorId = req.user.id;
  
  if (!name) {
    return res.status(400).json({ message: '群组名称不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('创建群组:', { creatorId, name, description });
    
    // 创建群组
    const [result] = await pool.execute(
      'INSERT INTO groups (name, description, creator_id) VALUES (?, ?, ?)',
      [name, description || '', creatorId]
    );
    
    const groupId = result.insertId;
    
    // 添加创建者为群成员（管理员角色）
    await pool.execute(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, "admin")',
      [groupId, creatorId]
    );
    
    res.status(201).json({ 
      message: '群组创建成功',
      group: {
        id: groupId,
        name,
        description: description || '',
        creator_id: creatorId
      }
    });
  } catch (error) {
    console.error('创建群组失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 2. 获取我的群聊列表
app.get('/api/groups/my', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 获取用户所在的群组
    const [rows] = await pool.execute(
      `SELECT g.id, g.name, g.description, g.creator_id, g.created_at, g.updated_at, gm.role,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY g.updated_at DESC`,
      [userId]
    );
    
    // 添加调试日志
    console.log('获取我的群聊列表:', rows);
    
    res.json({ groups: rows });
  } catch (error) {
    console.error('获取群组列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 3. 获取群聊详情
app.get('/api/groups/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // 检查群组是否存在
    const [groupRows] = await pool.execute(
      `SELECT g.id, g.name, g.description, g.creator_id, g.created_at, g.updated_at,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       WHERE g.id = ?`,
      [groupId]
    );
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    // 检查用户是否是群成员
    const [memberRows] = await pool.execute(
      'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '你不是该群成员' });
    }
    
    // 获取群成员列表
    const [membersRows] = await pool.execute(
      `SELECT gm.user_id, gm.role, gm.joined_at, u.username
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.role = 'admin' DESC, gm.joined_at ASC`,
      [groupId]
    );
    
    // 添加调试日志
    console.log('获取群聊详情:', { group: groupRows[0], members: membersRows });
    
    res.json({
      group: groupRows[0],
      members: membersRows,
      userRole: memberRows[0].role
    });
  } catch (error) {
    console.error('获取群组详情失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 4. 邀请好友加入群聊
app.post('/api/groups/:groupId/invite', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { friendIds } = req.body;
  const userId = req.user.id;
  
  if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
    return res.status(400).json({ message: '好友ID列表不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('邀请好友加入群聊:', { groupId, userId, friendIds });
    
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    // 检查用户是否是群成员
    const [memberRows] = await pool.execute(
      'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '你不是该群成员，无法邀请好友' });
    }
    
    // 验证好友关系
    const addedFriends = [];
    const errors = [];
    
    for (const friendId of friendIds) {
      // 检查是否是好友
      const [friendRows] = await pool.execute(
        'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
        [userId, friendId]
      );
      
      if (friendRows.length === 0) {
        errors.push(`ID为${friendId}的用户不是你的好友`);
        continue;
      }
      
      // 检查是否已经是群成员
      const [existingMemberRows] = await pool.execute(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, friendId]
      );
      
      if (existingMemberRows.length > 0) {
        errors.push(`ID为${friendId}的用户已经是群成员`);
        continue;
      }
      
      // 添加为群成员
      await pool.execute(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, "member")',
        [groupId, friendId]
      );
      
      addedFriends.push(friendId);
    }
    
    res.status(200).json({
      message: `已成功邀请${addedFriends.length}位好友加入群聊`,
      addedFriends,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('邀请好友加入群聊失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 5. 退出群聊
app.post('/api/groups/:groupId/leave', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // 添加调试日志
    console.log('退出群聊:', { groupId, userId });
    
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id, creator_id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    const group = groupRows[0];
    
    // 检查用户是否是群成员
    const [memberRows] = await pool.execute(
      'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '你不是该群成员' });
    }
    
    // 如果是群主，不能直接退出
    if (group.creator_id === userId) {
      return res.status(400).json({ message: '群主不能直接退出群聊，请先转让群主或解散群聊' });
    }
    
    // 退出群聊
    await pool.execute(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    res.json({ message: '已退出群聊' });
  } catch (error) {
    console.error('退出群聊失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 6. 解散群聊（仅群主可操作）
app.delete('/api/groups/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  try {
    // 添加调试日志
    console.log('解散群聊:', { groupId, userId });
    
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id, creator_id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    const group = groupRows[0];
    
    // 检查用户是否是群主
    if (group.creator_id !== userId) {
      return res.status(403).json({ message: '只有群主才能解散群聊' });
    }
    
    // 开始事务
    await pool.execute('START TRANSACTION');
    
    try {
      // 删除群成员
      await pool.execute('DELETE FROM group_members WHERE group_id = ?', [groupId]);
      
      // 删除群消息
      await pool.execute('DELETE FROM group_messages WHERE group_id = ?', [groupId]);
      
      // 删除群组
      await pool.execute('DELETE FROM groups WHERE id = ?', [groupId]);
      
      // 提交事务
      await pool.execute('COMMIT');
      
      res.json({ message: '群聊已解散' });
    } catch (error) {
      // 回滚事务
      await pool.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('解散群聊失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 7. 转让群主（仅群主可操作）
app.post('/api/groups/:groupId/transfer', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { newOwnerId } = req.body;
  const userId = req.user.id;
  
  if (!newOwnerId) {
    return res.status(400).json({ message: '新群主ID不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('转让群主:', { groupId, userId, newOwnerId });
    
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id, creator_id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    const group = groupRows[0];
    
    // 检查用户是否是群主
    if (group.creator_id !== userId) {
      return res.status(403).json({ message: '只有群主才能转让群主权限' });
    }
    
    // 检查新群主是否是群成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, newOwnerId]
    );
    
    if (memberRows.length === 0) {
      return res.status(404).json({ message: '新群主不是群成员' });
    }
    
    // 开始事务
    await pool.execute('START TRANSACTION');
    
    try {
      // 更新群组创建者
      await pool.execute(
        'UPDATE groups SET creator_id = ? WHERE id = ?',
        [newOwnerId, groupId]
      );
      
      // 更新原群主为普通成员
      await pool.execute(
        'UPDATE group_members SET role = "member" WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
      );
      
      // 更新新群主为管理员
      await pool.execute(
        'UPDATE group_members SET role = "admin" WHERE group_id = ? AND user_id = ?',
        [groupId, newOwnerId]
      );
      
      // 提交事务
      await pool.execute('COMMIT');
      
      res.json({ message: '群主已转让' });
    } catch (error) {
      // 回滚事务
      await pool.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('转让群主失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 8. 修改群信息（仅群主和管理员可操作）
app.put('/api/groups/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { name, description } = req.body;
  const userId = req.user.id;
  
  if (!name) {
    return res.status(400).json({ message: '群组名称不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('修改群信息:', { groupId, userId, name, description });
    
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    // 检查用户是否是群主或管理员
    const [memberRows] = await pool.execute(
      'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ? AND role IN ("admin")',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '只有群主或管理员才能修改群信息' });
    }
    
    // 更新群组信息
    await pool.execute(
      'UPDATE groups SET name = ?, description = ? WHERE id = ?',
      [name, description || '', groupId]
    );
    
    res.json({ 
      message: '群信息已更新',
      group: {
        id: parseInt(groupId),
        name,
        description: description || ''
      }
    });
  } catch (error) {
    console.error('修改群信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 9. 获取群聊消息
app.get('/api/groups/:groupId/messages', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const { limit = 50, before } = req.query;
  
  try {
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    // 检查用户是否是群成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '你不是该群成员，无法查看消息' });
    }
    
    // 构建查询条件
    let query = `
      SELECT gm.id, gm.sender_id, gm.content, gm.message_type, gm.created_at, u.username as sender_name
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.group_id = ?
    `;
    
    const queryParams = [groupId];
    
    if (before) {
      query += ' AND gm.id < ?';
      queryParams.push(before);
    }
    
    query += ' ORDER BY gm.id DESC LIMIT ?';
    queryParams.push(parseInt(limit));
    
    // 获取消息
    const [rows] = await pool.execute(query, queryParams);
    
    // 添加调试日志
    console.log('获取群聊消息:', { groupId, userId, messageCount: rows.length });
    
    res.json({ messages: rows.reverse() });
  } catch (error) {
    console.error('获取群聊消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 10. 发送群聊消息
app.post('/api/groups/:groupId/messages', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { content, messageType = 'text' } = req.body;
  const senderId = req.user.id;
  
  if (!content) {
    return res.status(400).json({ message: '消息内容不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('发送群聊消息:', { groupId, senderId, messageType });
    
    // 检查群组是否存在
    const [groupRows] = await pool.execute('SELECT id FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    // 检查用户是否是群成员
    const [memberRows] = await pool.execute(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, senderId]
    );
    
    if (memberRows.length === 0) {
      return res.status(403).json({ message: '你不是该群成员，无法发送消息' });
    }
    
    // 发送消息
    const [result] = await pool.execute(
      'INSERT INTO group_messages (group_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)',
      [groupId, senderId, content, messageType]
    );
    
    // 更新群组最后活动时间
    await pool.execute(
      'UPDATE groups SET updated_at = NOW() WHERE id = ?',
      [groupId]
    );
    
    res.status(201).json({
      message: '消息已发送',
      messageId: result.insertId
    });
  } catch (error) {
    console.error('发送群聊消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});
// 好友系统API实现

// 搜索用户
app.get('/api/users/search', authMiddleware, async (req, res) => {
  const { username } = req.query;
  
  if (!username) {
    return res.status(400).json({ message: '请提供用户名进行搜索' });
  }
  
  try {
    const [rows] = await pool.execute(
      'SELECT id, username FROM users WHERE username LIKE ? AND id != ?',
      [`%${username}%`, req.user.id]
    );
    
    res.json({ users: rows });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 发送好友请求
app.post('/api/friend-requests', authMiddleware, async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;
  
  if (!receiverId) {
    return res.status(400).json({ message: '接收者ID不能为空' });
  }
  
  try {
    // 检查用户是否存在
    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiverId]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查是否已经是好友
    const [friendRows] = await pool.execute(
      'SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [senderId, receiverId, receiverId, senderId]
    );
    
    if (friendRows.length > 0) {
      return res.status(400).json({ message: '你们已经是好友了' });
    }
    
    // 检查是否已经发送过请求
    const [requestRows] = await pool.execute(
      'SELECT id, status FROM friend_requests WHERE sender_id = ? AND receiver_id = ?',
      [senderId, receiverId]
    );
    
    if (requestRows.length > 0) {
      if (requestRows[0].status === 'pending') {
        return res.status(400).json({ message: '你已经发送过好友请求，等待对方接受' });
      } else if (requestRows[0].status === 'rejected') {
        // 如果之前被拒绝，可以更新为pending重新发送
        await pool.execute(
          'UPDATE friend_requests SET status = "pending", updated_at = NOW() WHERE id = ?',
          [requestRows[0].id]
        );
        return res.status(200).json({ message: '好友请求已重新发送' });
      }
    }
    
    // 检查对方是否已经向自己发送请求
    const [reverseRequestRows] = await pool.execute(
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [receiverId, senderId]
    );
    
    if (reverseRequestRows.length > 0) {
      return res.status(400).json({ message: '对方已经向你发送了好友请求，请先处理' });
    }
    
    // 创建好友请求
    await pool.execute(
      'INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)',
      [senderId, receiverId]
    );
    
    // 通过Socket.io通知接收者
    const receiverSocketId = Object.keys(users).find(key => users[key] === receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('friend_request', {
        id: senderId,
        username: req.user.username
      });
    }
    
    res.status(201).json({ message: '好友请求已发送' });
  } catch (error) {
    console.error('发送好友请求失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取好友请求列表
app.get('/api/friend-requests', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 获取收到的好友请求
    const [receivedRows] = await pool.execute(
      `SELECT fr.id, fr.sender_id, fr.status, fr.created_at, fr.updated_at, u.username as sender_username
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = ? AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    
    // 获取发送的好友请求
    const [sentRows] = await pool.execute(
      `SELECT fr.id, fr.receiver_id, fr.status, fr.created_at, fr.updated_at, u.username as receiver_username
       FROM friend_requests fr
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.sender_id = ?
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    
    res.json({
      received: receivedRows,
      sent: sentRows
    });
  } catch (error) {
    console.error('获取好友请求列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 处理好友请求
app.put('/api/friend-requests/:requestId', authMiddleware, async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  
  if (!status || !['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: '状态无效，必须是 accepted 或 rejected' });
  }
  
  try {
    // 检查请求是否存在且接收者是当前用户
    const [requestRows] = await pool.execute(
      'SELECT id, sender_id, receiver_id FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, userId]
    );
    
    if (requestRows.length === 0) {
      return res.status(404).json({ message: '好友请求不存在或已处理' });
    }
    
    const request = requestRows[0];
    
    // 更新请求状态
    await pool.execute(
      'UPDATE friend_requests SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, requestId]
    );
    
    // 如果接受请求，创建好友关系
    if (status === 'accepted') {
      await pool.execute(
        'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)',
        [userId, request.sender_id, request.sender_id, userId]
      );
      
      // 通过Socket.io通知发送者
      const senderSocketId = Object.keys(users).find(key => users[key] === request.sender_id);
      if (senderSocketId) {
        io.to(senderSocketId).emit('friend_request_accepted', {
          id: userId,
          username: req.user.username
        });
      }
      
      res.json({ message: '已接受好友请求' });
    } else {
      res.json({ message: '已拒绝好友请求' });
    }
  } catch (error) {
    console.error('处理好友请求失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取好友列表
app.get('/api/friends', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.username
       FROM friendships f
       JOIN users u ON f.friend_id = u.id
       WHERE f.user_id = ?
       ORDER BY u.username`,
      [userId]
    );
    
    res.json({ friends: rows });
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除好友
app.delete('/api/friends/:friendId', authMiddleware, async (req, res) => {
  const { friendId } = req.params;
  const userId = req.user.id;
  
  try {
    // 检查是否是好友
    const [friendRows] = await pool.execute(
      'SELECT id FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );
    
    if (friendRows.length === 0) {
      return res.status(404).json({ message: '好友关系不存在' });
    }
    
    // 删除好友关系
    await pool.execute(
      'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );
    
    res.json({ message: '已删除好友关系' });
  } catch (error) {
    console.error('删除好友失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});
