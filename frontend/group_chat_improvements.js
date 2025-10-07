// 群聊系统功能改进实现

// 导入必要的模块
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'im_chat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 用户认证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '未授权，请先登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 获取用户信息
    const [rows] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [decoded.id]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    req.user = rows[0];
    next();
  } catch (error) {
    console.error('认证失败:', error);
    res.status(401).json({ message: '认证失败，请重新登录' });
  }
};

// 在线用户映射 (socket.id -> userId)
const users = {};

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log('新的Socket连接:', socket.id);
  
  // 用户认证
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      users[socket.id] = decoded.id;
      socket.join(`user_${decoded.id}`);
      console.log(`用户 ${decoded.id} 已认证`);
      
      // 获取用户加入的群组
      pool.execute(
        'SELECT group_id FROM group_members WHERE user_id = ?',
        [decoded.id]
      ).then(([rows]) => {
        rows.forEach(row => {
          socket.join(`group_${row.group_id}`);
        });
        console.log(`用户 ${decoded.id} 已加入群组聊天室`);
      }).catch(error => {
        console.error('获取用户群组失败:', error);
      });
    } catch (error) {
      console.error('Socket认证失败:', error);
    }
  });
  
  // 加入群聊
  socket.on('join_group', (groupId) => {
    if (!users[socket.id]) return;
    
    socket.join(`group_${groupId}`);
    console.log(`用户 ${users[socket.id]} 加入群组 ${groupId} 聊天室`);
  });
  
  // 离开群聊
  socket.on('leave_group', (groupId) => {
    if (!users[socket.id]) return;
    
    socket.leave(`group_${groupId}`);
    console.log(`用户 ${users[socket.id]} 离开群组 ${groupId} 聊天室`);
  });
  
  // 断开连接
  socket.on('disconnect', () => {
    console.log('Socket断开连接:', socket.id);
    delete users[socket.id];
  });
});

// 1. 创建群聊功能
app.post('/api/groups', authMiddleware, async (req, res) => {
  const { name, description, memberIds } = req.body;
  const creatorId = req.user.id;
  
  if (!name) {
    return res.status(400).json({ message: '群组名称不能为空' });
  }
  
  try {
    // 添加调试日志
    console.log('创建群组:', { creatorId, name, description, memberIds });
    
    // 开始事务
    await pool.execute('START TRANSACTION');
    
    try {
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
      
      // 如果提供了成员ID列表，添加这些成员
      if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
        // 验证成员是否是创建者的好友
        const validMembers = [];
        
        for (const memberId of memberIds) {
          // 检查是否是好友
          const [friendRows] = await pool.execute(
            'SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?',
            [creatorId, memberId]
          );
          
          if (friendRows.length > 0) {
            validMembers.push(memberId);
          }
        }
        
        // 添加有效成员
        for (const memberId of validMembers) {
          await pool.execute(
            'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, "member")',
            [groupId, memberId]
          );
          
          // 通过Socket.io通知被邀请者
          io.to(`user_${memberId}`).emit('group_invitation', {
            group_id: groupId,
            group_name: name,
            inviter_id: creatorId,
            inviter_name: req.user.username
          });
        }
      }
      
      // 提交事务
      await pool.execute('COMMIT');
      
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
      // 回滚事务
      await pool.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('创建群组失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 2. 获取我的群聊列表
app.get('/api/groups', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // 获取用户所在的群组
    const [rows] = await pool.execute(
      `SELECT g.id, g.name, g.description, g.creator_id, g.created_at, g.updated_at, gm.role,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
              (SELECT content FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
              (SELECT gs.is_pinned FROM group_settings gs WHERE gs.group_id = g.id AND gs.user_id = ? LIMIT 1) as is_pinned,
              (SELECT gs.is_muted FROM group_settings gs WHERE gs.group_id = g.id AND gs.user_id = ? LIMIT 1) as is_muted
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY is_pinned DESC, g.updated_at DESC`,
      [userId, userId, userId]
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
    
    // 获取群设置
    const [settingsRows] = await pool.execute(
      'SELECT is_pinned, is_muted FROM group_settings WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    const settings = settingsRows.length > 0 ? settingsRows[0] : { is_pinned: false, is_muted: false };
    
    // 添加调试日志
    console.log('获取群聊详情:', { group: groupRows[0], members: membersRows });
    
    res.json({
      group: groupRows[0],
      members: membersRows,
      userRole: memberRows[0].role,
      settings
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
    const [groupRows] = await pool.execute('SELECT id, name FROM groups WHERE id = ?', [groupId]);
    
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
      
      // 获取好友用户名
      const [userRows] = await pool.execute(
        'SELECT username FROM users WHERE id = ?',
        [friendId]
      );
      
      if (userRows.length > 0) {
        addedFriends.push({
          id: friendId,
          username: userRows[0].username
        });
        
        // 通过Socket.io通知被邀请者
        io.to(`user_${friendId}`).emit('group_invitation', {
          group_id: groupId,
          group_name: group.name,
          inviter_id: userId,
          inviter_name: req.user.username
        });
      }
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
    
    // 删除群设置
    await pool.execute(
      'DELETE FROM group_settings WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    // 通过Socket.io离开群聊室
    const socketId = Object.keys(users).find(key => users[key] === userId);
    if (socketId) {
      io.sockets.sockets.get(socketId)?.leave(`group_${groupId}`);
    }
    
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
      // 获取群成员列表
      const [memberRows] = await pool.execute(
        'SELECT user_id FROM group_members WHERE group_id = ?',
        [groupId]
      );
      
      // 删除群设置
      await pool.execute('DELETE FROM group_settings WHERE group_id = ?', [groupId]);
      
      // 删除群成员
      await pool.execute('DELETE FROM group_members WHERE group_id = ?', [groupId]);
      
      // 删除群消息
      await pool.execute('DELETE FROM group_messages WHERE group_id = ?', [groupId]);
      
      // 删除群组
      await pool.execute('DELETE FROM groups WHERE id = ?', [groupId]);
      
      // 提交事务
      await pool.execute('COMMIT');
      
      // 通知所有群成员
      memberRows.forEach(member => {
        io.to(`user_${member.user_id}`).emit('group_dissolved', {
          group_id: groupId,
          dissolver_id: userId,
          dissolver_name: req.user.username
        });
      });
      
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
    const [groupRows] = await pool.execute('SELECT id, creator_id, name FROM groups WHERE id = ?', [groupId]);
    
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
    
    // 获取新群主用户名
    const [userRows] = await pool.execute(
      'SELECT username FROM users WHERE id = ?',
      [newOwnerId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ message: '新群主用户不存在' });
    }
    
    const newOwnerName = userRows[0].username;
    
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
      
      // 通知新群主
      io.to(`user_${newOwnerId}`).emit('group_owner_transferred', {
        group_id: groupId,
        group_name: group.name,
        previous_owner_id: userId,
        previous_owner_name: req.user.username
      });
      
      // 通知群成员
      io.to(`group_${groupId}`).emit('group_announcement', {
        group_id: groupId,
        message: `群主已从 ${req.user.username} 转让给 ${newOwnerName}`
      });
      
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
    const [groupRows] = await pool.execute('SELECT id, name FROM groups WHERE id = ?', [groupId]);
    
    if (groupRows.length === 0) {
      return res.status(404).json({ message: '群组不存在' });
    }
    
    const oldName = groupRows[0].name;
    
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
    
    // 如果群名称改变，通知群成员
    if (name !== oldName) {
      io.to(`group_${groupId}`).emit('group_name_changed', {
        group_id: groupId,
        old_name: oldName,
        new_name: name,
        changer_id: userId,
        changer_name: req.user.username
      });
    }
    
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
      SELECT gm.id, gm.group_id, gm.sender_id, gm.content, gm.message_type, gm.is_recalled, gm.created_at, 
             u.username as sender_name
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
    
    const messageId = result.insertId;
    
    // 更新群组最后活动时间
    await pool.execute(
      'UPDATE groups SET updated_at = NOW() WHERE id = ?',
      [groupId]
    );
    
    // 获取发送者信息
    const [userRows] = await pool.execute(
      'SELECT username FROM users WHERE id = ?',
      [senderId]
    );
    
    const senderName = userRows[0]?.username || '';
    
    // 通过Socket.io广播消息
    io.to(`group_${groupId}`).emit('group_message', {
      id: messageId,
      group_id: groupId,
      sender_id: senderId,
      sender_name: senderName,
      content,
      message_type: messageType,
      is_recalled: false,
      created_at: new Date()
    });
    
    res.status(201).json({
      message: '消息已发送',
      messageId
    });
  } catch (error) {
    console.error('发送群聊消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 11. 撤回群聊消息
app.post('/api/groups/:groupId/messages/:messageId/recall', authMiddleware, async (req, res) => {
  const { groupId, messageId } = req.params;
  const userId = req.user.id;
  
  try {
    // 添加调试日志
    console.log('撤回群聊消息:', { groupId, messageId, userId });
    
    // 检查消息是否存在
    const [messageRows] = await pool.execute(
      'SELECT id, sender_id, created_at FROM group_messages WHERE id = ? AND group_id = ?',
      [messageId, groupId]
    );
    
    if (messageRows.length === 0) {
      return res.status(404).json({ message: '消息不存在' });
    }
    
    const message = messageRows[0];
    
    // 检查是否是消息发送者
    if (message.sender_id !== userId) {
      // 检查是否是群管理员
      const [memberRows] = await pool.execute(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND role = "admin"',
        [groupId, userId]
      );
      
      if (memberRows.length === 0) {
        return res.status(403).json({ message: '只有消息发送者或群管理员才能撤回消息' });
      }
    }
    
    // 检查消息是否在2分钟内
    const messageTime = new Date(message.created_at).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = (currentTime - messageTime) / 1000 / 60; // 分钟
    
    if (timeDiff > 2 && message.sender_id === userId) {
      return res.status(400).json({ message: '只能撤回2分钟内发送的消息' });
    }
    
    // 撤回消息
    await pool.execute(
      'UPDATE group_messages SET is_recalled = true WHERE id = ?',
      [messageId]
    );
    
    // 通过Socket.io广播撤回消息
    io.to(`group_${groupId}`).emit('message_recalled', {
      group_id: groupId,
      message_id: messageId,
      recaller_id: userId,
      recaller_name: req.user.username
    });
    
    res.json({ message: '消息已撤回' });
  } catch (error) {
    console.error('撤回消息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 12. 设置群聊置顶/静音
app.put('/api/groups/:groupId/settings', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { isPinned, isMuted } = req.body;
  const userId = req.user.id;
  
  try {
    // 添加调试日志
    console.log('设置群聊:', { groupId, userId, isPinned, isMuted });
    
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
      return res.status(403).json({ message: '你不是该群成员' });
    }
    
    // 检查是否已有设置
    const [settingsRows] = await pool.execute(
      'SELECT id FROM group_settings WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (settingsRows.length > 0) {
      // 更新设置
      await pool.execute(
        'UPDATE group_settings SET is_pinned = ?, is_muted = ? WHERE group_id = ? AND user_id = ?',
        [isPinned, isMuted, groupId, userId]
      );
    } else {
      // 创建设置
      await pool.execute(
        'INSERT INTO group_settings (group_id, user_id, is_pinned, is_muted) VALUES (?, ?, ?, ?)',
        [groupId, userId, isPinned, isMuted]
      );
    }
    
    res.json({ 
      message: '群聊设置已更新',
      settings: {
        is_pinned: isPinned,
        is_muted: isMuted
      }
    });
  } catch (error) {
    console.error('设置群聊失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 13. 上传群聊图片
app.post('/api/groups/:groupId/upload/image', authMiddleware, upload.single('image'), async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  
  if (!req.file) {
    return res.status(400).json({ message: '请选择要上传的图片' });
  }
  
  try {
    // 添加调试日志
    console.log('上传群聊图片:', { groupId, userId, file: req.file });
    
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
      return res.status(403).json({ message: '你不是该群成员，无法发送消息' });
    }
    
    // 构建图片URL
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // 发送图片消息
    const [result] = await pool.execute(
      'INSERT INTO group_messages (group_id, sender_id, content, message_type) VALUES (?, ?, ?, ?)',
      [groupId, userId, imageUrl, 'image']
    );
    
    const messageId = result.insertId;
    
    // 更新群组最后活动时间
    await pool.execute(
      'UPDATE groups SET updated_at = NOW() WHERE id = ?',
      [groupId]
    );
    
    // 获取发送者信息
    const [userRows] = await pool.execute(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );
    
    const senderName = userRows[0]?.username || '';
    
    // 通过Socket.io广播消息
    io.to(`group_${groupId}`).emit('group_message', {
      id: messageId,
      group_id: groupId,
      sender_id: userId,
      sender_name: senderName,
      content: imageUrl,
      message_type: 'image',
      is_recalled: false,
      created_at: new Date()
    });
    
    res.status(201).json({
      message: '图片已发送',
      messageId,
      imageUrl
    });
  } catch (error) {
    console.error('上传群聊图片失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = { app, server, io };
