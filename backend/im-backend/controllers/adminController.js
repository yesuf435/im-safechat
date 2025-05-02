const pool = require('../config/db');

const AdminController = {
  async listSessions(req, res) {
    const [rows] = await pool.query('SELECT * FROM user_sessions ORDER BY connected_at DESC');
    res.json(rows);
  },
  async kickUser(req, res) {
    const userId = req.params.userId;
    // 踢人逻辑预留：你可以集成 socket.disconnect() 配合用户 socket map 实现
    res.json({ kicked: userId });
  }
};

module.exports = AdminController;
