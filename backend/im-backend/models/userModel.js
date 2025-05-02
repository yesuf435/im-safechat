const pool = require('../config/db');

const UserModel = {
  async findByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },
  async createUser(username, passwordHash) {
    const [res] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, passwordHash]
    );
    return res.insertId;
  },
  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },
  async getAllUsers() {
    const [rows] = await pool.query('SELECT id, username FROM users');
    return rows;
  }
};

module.exports = UserModel;
