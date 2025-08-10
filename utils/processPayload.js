/**
 * Run this script to process all JSON files in backend/payloads/
 * Usage:
 *   1. put sample JSON webhook files into backend/payloads/
 *   2. set MONGO_URI in .env
 *   3. from backend/ run: npm run process:payloads
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const connectDB = require('../config/db');
const Message = require('../models/Message');

const folder = path.join(__dirname, '..', '..', 'payloads');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseAndInsert = async (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.warn(`Skipping invalid JSON: ${filePath}`);
    return;
  }

  if (!payload.entry) return;

  const entry = payload.entry[0];
  if (!entry) return;
  const change = entry.changes ? (entry.changes[0].value || entry.changes[0]) : entry;

  // messages
  if (change.messages && Array.isArray(change.messages)) {
    for (const msg of change.messages) {
      const wa_id = (change.contacts && change.contacts[0] && change.contacts[0].wa_id) || msg.from || null;
      const name = (change.contacts && change.contacts[0] && change.contacts[0].profile && change.contacts[0].profile.name) || null;
      const number = wa_id;
      const text = (msg.text && msg.text.body) || (msg.message && msg.message.text && msg.message.text.body) || msg.body || '';
      try {
        await Message.create({
          wa_id,
          name,
          number,
          text,
          timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
          status: 'sent',
          msg_id: msg.id || msg.message_id || null,
          meta_msg_id: msg.meta_msg_id || null
        });
        console.log('Inserted message from file:', path.basename(filePath));
      } catch (err) {
        console.error('Insert error:', err.message);
      }
    }
  }

  // statuses
  if (change.statuses && Array.isArray(change.statuses)) {
    for (const statusUpdate of change.statuses) {
      const id = statusUpdate.id || statusUpdate.message_id || null;
      const metaId = statusUpdate.meta_msg_id || null;
      const newStatus = statusUpdate.status || 'sent';
      try {
        let updated = null;
        if (id) {
          updated = await Message.findOneAndUpdate({ msg_id: id }, { status: newStatus }, { new: true });
        }
        if (!updated && metaId) {
          updated = await Message.findOneAndUpdate({ meta_msg_id: metaId }, { status: newStatus }, { new: true });
        }
        console.log('Status update applied for file:', path.basename(filePath), { id, metaId, newStatus, updated: !!updated });
      } catch (err) {
        console.error('Status update error:', err.message);
      }
    }
  }
};

(async () => {
  await connectDB();
  if (!fs.existsSync(folder)) {
    console.error('Payload folder not found:', folder);
    process.exit(1);
  }
  const files = fs.readdirSync(folder).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No JSON files in payloads/ to process.');
    process.exit(0);
  }
  for (const f of files) {
    const p = path.join(folder, f);
    try {
      await parseAndInsert(p);
      // small delay to avoid flooding
      await sleep(100);
    } catch (err) {
      console.error('Error processing file', f, err.message);
    }
  }
  console.log('Finished processing payloads.');
  process.exit(0);
})();
