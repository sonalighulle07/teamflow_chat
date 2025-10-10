const db = require('../Utils/db'); 

const addOrUpdateReaction = async (msgId, userId, emoji) => {
    return pool.query(
        "INSERT INTO message_reactions (msg_id, user_id, emoji) VALUES (?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE emoji=?",
        [msgId, userId, emoji, emoji]
    );
};

const getReactionsByMessage = async (msgId) => {
    const [rows] = await pool.query(
        "SELECT user_id, emoji FROM message_reactions WHERE msg_id=?",
        [msgId]
    );
    return rows;
};

module.exports = { addOrUpdateReaction, getReactionsByMessage };
