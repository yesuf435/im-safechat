const express = require('express');
const jwt = require('jsonwebtoken');
const GroupController = require('../controllers/groupController');

const router = express.Router();

router.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.sendStatus(403);
  }
});

router.post('/create', GroupController.create);
router.post('/join', GroupController.join);
router.get('/list', GroupController.list);
router.get('/:groupId/messages', GroupController.messages);

module.exports = router;
