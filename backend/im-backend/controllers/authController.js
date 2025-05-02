const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const JWT_SECRET = process.env.JWT_SECRET;

const AuthController = {
  async register(req, res) {
    const { username, password } = req.body;
    const existing = await UserModel.findByUsername(username);
    if (existing) return res.status(400).json({ message: '用户已存在' });

    const hash = await bcrypt.hash(password, 10);
    const userId = await UserModel.createUser(username, hash);
    res.json({ userId, username });
  },

  async login(req, res) {
    const { username, password } = req.body;
    const user = await UserModel.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: '账号或密码错误' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  },

  async list(req, res) {
    const users = await UserModel.getAllUsers();
    res.json(users);
  }
};

module.exports = AuthController;
