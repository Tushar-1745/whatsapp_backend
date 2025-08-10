const express = require('express');
const router = express.Router();
const { getChats, getMessages } = require('../controllers/chatController');

/**
 * GET /api/chats
 * Returns list of chats (wa_id + last message)
 */
router.get('/', getChats);

/**
 * GET /api/chats/:wa_id/messages
 * Returns all messages for a wa_id
 */
router.get('/:wa_id/messages', getMessages);

module.exports = router;
