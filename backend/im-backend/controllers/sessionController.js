const SessionModel = require('../models/sessionModel');
const SessionController = {
  async list(req, res) {
    if (req.user?.username !== 'admin') {
      return res.status(403).json({ message: '仅限管理员' });
    }
    const sessions = await SessionModel.getAllSessions();
    res.json(sessions);
  }
};
module.exports = SessionController;
