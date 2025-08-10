const Message = require('../models/Message');

/**
 * getChats - returns list of chats grouped by wa_id with last message preview
 */
const getChats = async (req, res) => {
  try {
    // aggregate by wa_id and pick latest message
    const chats = await Message.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$wa_id',
          name: { $first: '$name' },
          number: { $first: '$number' },
          lastMessage: { $first: '$text' },
          lastTimestamp: { $first: '$timestamp' },
          lastStatus: { $first: '$status' },
          lastMsgId: { $first: '$msg_id' }
        }
      },
      { $sort: { lastTimestamp: -1 } }
    ]);
    res.json(chats);
  } catch (err) {
    console.error('getChats error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * getMessages - returns all messages for a given wa_id
 */
const getMessages = async (req, res) => {
  try {
    const wa_id = req.params.wa_id;
    if (!wa_id) return res.status(400).json({ error: 'wa_id required' });

    const messages = await Message.find({ wa_id }).sort({ timestamp: 1 }).lean();
    res.json(messages);
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getChats, getMessages };
