const express = require('express');
const jwt = require('jsonwebtoken');
const SessionController = require('../controllers/sessionController');

const router = express.Router();

router.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.sendStatus(403);
  }
});

router.get('/list', SessionController.list);

module.exports = router;
