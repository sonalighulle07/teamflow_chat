const { TeamMember } = require("../models/TeamModel");

async function teamAuthMiddleware(req, res, next) {
  const userId = req.user?.id; // must come from authMiddleware
  const teamId = req.params.id;

  console.log("teamAuthMiddleware invoked for team ID:", teamId);
  console.log("teamAuthMiddleware - userId:", userId);

  if (!userId) return res.status(401).json({ error: "Not authorized" });

  try {
    const members = await TeamMember.getMembers(teamId);
    console.log("teamAuthMiddleware - members:", members);

    const isMember = members.some(member => member.id === userId);

    if (!isMember)
      return res.status(403).json({ error: "You are not a member of this team" });

    next();
  } catch (err) {
    console.error("Team membership check failed:", err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = teamAuthMiddleware;
