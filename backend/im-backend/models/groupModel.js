const pool = require('../config/db');

const GroupModel = {
  async createGroup(name, creatorId) {
    const [res] = await pool.query('INSERT INTO groups (name, creator_id) VALUES (?, ?)', [name, creatorId]);
    await pool.query('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [res.insertId, creatorId]);
    return res.insertId;
  },
  async joinGroup(groupId, userId) {
    await pool.query('INSERT IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)', [groupId, userId]);
  },
  async getUserGroups(userId) {
    const [rows] = await pool.query(
      'SELECT g.id, g.name FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = ?',
      [userId]
    );
    return rows;
  }
};

module.exports = GroupModel;
