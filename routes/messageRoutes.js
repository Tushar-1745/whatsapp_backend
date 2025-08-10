const express = require('express');
const router = express.Router();
const { processWebhook, sendMessage } = require('../controllers/messageController');

/**
 * POST /api/messages/webhook
 * Accepts a single webhook payload (same shape as sample JSON).
 */
router.post('/webhook', processWebhook);

/**
 * POST /api/messages
 * Create a new message from frontend (send message demo).
 * Body: { wa_id, name, number, text }
 */
router.post('/', sendMessage);

module.exports = router;
