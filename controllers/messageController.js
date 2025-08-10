const Message = require('../models/Message');

/**
 * processWebhook - expects a payload shaped like WhatsApp Business API webhooks.
 * It will insert messages or update statuses depending on payload content.
 */
const processWebhook = async (req, res) => {
  try {
    const payload = req.body;
    // payload may have entry -> changes[0].value similar to sample files
    if (!payload || !payload.entry) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }

    const entry = payload.entry[0];
    if (!entry || !entry.changes) return res.status(400).json({ error: 'No changes in payload' });

    const change = entry.changes[0].value || entry.changes[0];
    // If messages are present -> create message(s)
    if (change.messages && Array.isArray(change.messages)) {
      const created = [];
      for (const msg of change.messages) {
        const wa_id = (change.contacts && change.contacts[0] && change.contacts[0].wa_id) || msg.from || null;
        const name = (change.contacts && change.contacts[0] && change.contacts[0].profile && change.contacts[0].profile.name) || null;
        const number = (change.contacts && change.contacts[0] && change.contacts[0].wa_id) || null;

        // Support different message formats: text.body or msg.text.body
        const text =
          (msg.text && msg.text.body) ||
          (msg.message && msg.message.text && msg.message.text.body) ||
          msg.body ||
          '';

        const doc = await Message.create({
          wa_id,
          name,
          number,
          text,
          timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
          status: 'sent',
          msg_id: msg.id || msg.message_id || null,
          meta_msg_id: msg.meta_msg_id || null
        });
        created.push(doc);
      }
      return res.status(201).json({ inserted: created.length, created });
    }

    // If statuses are present -> update existing message(s)
    if (change.statuses && Array.isArray(change.statuses)) {
      const updates = [];
      for (const statusUpdate of change.statuses) {
        const id = statusUpdate.id || statusUpdate.message_id || statusUpdate.msg_id;
        const metaId = statusUpdate.meta_msg_id || null;
        const newStatus = statusUpdate.status || 'sent';

        // Try update by msg_id first, then meta_msg_id
        let updated = null;
        if (id) {
          updated = await Message.findOneAndUpdate(
            { msg_id: id },
            { status: newStatus },
            { new: true }
          );
        }
        if (!updated && metaId) {
          updated = await Message.findOneAndUpdate(
            { meta_msg_id: metaId },
            { status: newStatus },
            { new: true }
          );
        }
        updates.push({ id, metaId, updated });
      }
      return res.json({ updated: updates.length, details: updates });
    }

    return res.status(200).json({ message: 'No messages or statuses found in payload' });
  } catch (err) {
    console.error('processWebhook error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * sendMessage - called by frontend to create a new outgoing message
 * Body: { wa_id, name, number, text }
 */
const sendMessage = async (req, res) => {
  try {
    const { wa_id, name, number, text } = req.body;
    if (!wa_id || !text) return res.status(400).json({ error: 'wa_id and text required' });

    const msg = await Message.create({
      wa_id,
      name: name || null,
      number: number || null,
      text,
      timestamp: new Date(),
      status: 'sent',
      msg_id: Date.now().toString() // simple unique id for demo
    });

    return res.status(201).json(msg);
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { processWebhook, sendMessage };
