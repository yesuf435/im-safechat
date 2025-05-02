const GroupModel = require('../models/groupModel');
const GroupMessageModel = require('../models/groupMessageModel');

const GroupController = {
  async create(req, res) {
    const { name } = req.body;
    const groupId = await GroupModel.createGroup(name, req.userId);
    res.json({ groupId, name });
  },
  async join(req, res) {
    const { groupId } = req.body;
    await GroupModel.joinGroup(groupId, req.userId);
    res.json({ joined: true });
  },
  async list(req, res) {
    const groups = await GroupModel.getUserGroups(req.userId);
    res.json(groups);
  },
  async messages(req, res) {
    const { groupId } = req.params;
    const messages = await GroupMessageModel.getMessages(groupId);
    res.json(messages);
  }
};

module.exports = GroupController;
