const express = require('express');
const chatController = require('../controllers/chat.controller');
const { chatRateLimit } = require('../middleware/chatRateLimit');

const router = express.Router();

router.post('/message', chatRateLimit, chatController.postMessage);

module.exports = router;
