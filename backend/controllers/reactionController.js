const { addOrUpdateReaction, getReactionsByMessage } = require('../models/reactionModel');

const sendReaction = async (req, res) => {
  try {
    const { msgId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id; // from JWT middleware

    if (!msgId || !userId || !emoji) {
      return res.status(400).json({ error: "All fields required" });
    }

    await addOrUpdateReaction(msgId, userId, emoji);
    const reactions = await getReactionsByMessage(msgId);

    req.io.emit("reactionUpdated", { msgId, reactions });
    res.json({ success: true, msgId, reactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Reaction failed" });
  }
};

module.exports = { sendReaction };
