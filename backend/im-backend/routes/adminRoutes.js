const express = require('express');
const AdminController = require('../controllers/adminController');
const router = express.Router();

router.get('/sessions', AdminController.listSessions);
router.post('/kick/:userId', AdminController.kickUser);

module.exports = router;
