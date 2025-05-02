const pool = require('../config/db');
const SessionModel = {
  async logSession(userId, username, ip) {
    await pool.query(
      'INSERT INTO user_sessions (user_id, username, ip) VALUES (?, ?, ?)',
      [userId, username, ip]
    );
  },
  async getAllSessions() {
    const [rows] = await pool.query('SELECT * FROM user_sessions ORDER BY connected_at DESC');
    return rows;
  }
};
module.exports = SessionModel;
