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
