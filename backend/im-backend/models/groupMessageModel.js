const pool = require('../config/db');

const GroupMessageModel = {
  async save(groupId, senderId, content) {
    await pool.query(
      'INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)',
      [groupId, senderId, content]
    );
  },
  async getMessages(groupId) {
    const [rows] = await pool.query(
      'SELECT * FROM group_messages WHERE group_id = ? ORDER BY created_at ASC',
      [groupId]
    );
    return rows;
  }
};

module.exports = GroupMessageModel;
