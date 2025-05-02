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
