const express = require('express');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'boss') return res.sendStatus(403);
    req.user = decoded;
    next();
  } catch {
    return res.sendStatus(403);
  }
});

router.get('/messages', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/users', async (req, res) => {
  const [rows] = await pool.query('SELECT id, username, created_at FROM users');
  res.json(rows);
});

module.exports = router;
