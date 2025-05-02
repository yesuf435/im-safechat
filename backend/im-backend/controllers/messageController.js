const MessageModel = require('../models/messageModel');

const MessageController = {
  async getMessages(req, res) {
    const { userId, role } = req;
    const { withUserId } = req.params;
    const includeRecalled = role === 'admin' || role === 'agent';
    const messages = await MessageModel.getMessages(userId, withUserId, includeRecalled);
    res.json(messages);
  },

  async recall(req, res) {
    const { messageId } = req.params;
    await MessageModel.recallMessage(messageId, req.userId);
    res.json({ recalled: true });
  }
};

module.exports = MessageController;
