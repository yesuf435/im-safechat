const pool = require('../config/db');

const MessageModel = {
  async saveMessage(senderId, receiverId, content, type = 'text') {
    const [res] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content, type) VALUES (?, ?, ?, ?)',
      [senderId, receiverId, content, type]
    );
    return res.insertId;
  },
  async getMessages(user1, user2, includeRecalled = false) {
    let query = 'SELECT m.*, r.id as recalled FROM messages m LEFT JOIN recalled_messages r ON m.id = r.message_id WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY m.created_at ASC';
    const [rows] = await pool.query(query, [user1, user2, user2, user1]);
    if (!includeRecalled) return rows.filter(m => !m.recalled);
    return rows;
  },
  async recallMessage(messageId, userId) {
    await pool.query('INSERT INTO recalled_messages (message_id, recalled_by) VALUES (?, ?)', [messageId, userId]);
  }
};

module.exports = MessageModel;
