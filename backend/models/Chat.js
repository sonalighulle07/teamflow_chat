const pool = require('../utils/db');
const { encrypt, decrypt } = require('../utils/crypto');

class Chat {
    static async send({ senderId, receiverId, text, fileUrl=null, fileType=null, type='text' }) {
        const encryptedText = encrypt(text || '');
        const [result] = await pool.query(
            'INSERT INTO chats (sender_id, receiver_id, text, file_url, file_type, type, reactions) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [senderId, receiverId, encryptedText, fileUrl, fileType, type, JSON.stringify([])]
        );

        return {
            id: result.insertId,
            senderId,
            receiverId,
            text,
            file_url: fileUrl,
            file_type: fileType,
            type,
            edited: 0,
            reactions: [],
            timestamp: new Date()
        };
    }

    static async fetchChat(userId, otherId) {
        const [rows] = await pool.query(
            `SELECT c.*, 
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('username', mr.username, 'emoji', mr.emoji))
                 FROM message_reactions mr
                 WHERE mr.msg_id = c.id) AS reactions
             FROM chats c
             WHERE ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))
               AND deleted=0
             ORDER BY timestamp`,
            [userId, otherId, otherId, userId]
        );

        return rows.map(msg => ({
            ...msg,
            text: (msg.type === 'text' || msg.type === 'file') && msg.text ? decrypt(msg.text) : msg.text,
            reactions: msg.reactions ? JSON.parse(msg.reactions) : []
        }));
    }

    static async edit(msgId, newText) {
        await pool.query(
            'UPDATE chats SET text=?, edited=1, edited_at=NOW() WHERE id=?',
            [encrypt(newText), msgId]
        );
    }

    static async delete(msgId) {
        await pool.query('UPDATE chats SET deleted=1 WHERE id=?', [msgId]);
    }
}

module.exports = Chat;
