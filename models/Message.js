const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  wa_id: { type: String, required: true },        // WhatsApp user id
  name: { type: String },                         // contact name (if available)
  number: { type: String },                       // phone number (if available)
  text: { type: String, default: '' },            // message text
  timestamp: { type: Date, default: Date.now },   // when message was created
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'unknown'],
    default: 'sent'
  },
  msg_id: { type: String, index: true },          // message ID from payload
  meta_msg_id: { type: String, index: true }      // sometimes status refers to meta_msg_id
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
