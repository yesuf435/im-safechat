const express = require('express');
const jwt = require('jsonwebtoken');
const MessageController = require('../controllers/messageController');

const router = express.Router();

router.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role || 'customer';
    next();
  } catch {
    return res.sendStatus(403);
  }
});

router.get('/:withUserId', MessageController.getMessages);
router.post('/recall/:messageId', MessageController.recall);

module.exports = router;
