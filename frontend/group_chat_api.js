// 群聊系统API实现

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
