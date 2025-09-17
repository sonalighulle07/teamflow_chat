const pool = require('../utils/db');

class MessageReaction {
    static async add(msgId, username, emoji) {
        await pool.query('INSERT INTO message_reactions (msg_id, username, emoji) VALUES (?, ?, ?)',
            [msgId, username, emoji]);
    }

    static async getByMessage(msgId) {
        const [rows] = await pool.query('SELECT username, emoji FROM message_reactions WHERE msg_id=?', [msgId]);
        return rows;
    }
}

module.exports = MessageReaction;
