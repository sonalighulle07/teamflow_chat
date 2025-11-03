const { TeamMember } = require("../models/TeamModel");
 
async function teamAuthMiddleware(req, res, next) {
 
  console.log("teamAuthMiddleware invoked for team ID:", req.params.id);
  const userId = req.user?.id;
  console.log("User fromreq"+JSON.stringify(req.user));
  console.log("Authenticated user ID:", userId);
<<<<<<< HEAD
 
  const teamId = req.params.id;
 
=======

  const teamId = req.params.teamId;

>>>>>>> eeb48fb7539bc500ff9c7da708036908eb683630
  console.log("teamAuthMiddleware invoked for team ID:", teamId);
  console.log("teamAuthMiddleware - userId:", userId);
 
  if (!userId) return res.status(401).json({ error: "Not authorized" });
 
  try {
    const members = await TeamMember.getMembers(teamId);
    console.log("teamAuthMiddleware - members:", members);
 
    const isMember = members.some(
      (member) => Number(member.user_id) === Number(userId)
    );
 
    if (!isMember)
      return res.status(403).json({ error: "You are not a member of this team" });
 
    next();
  } catch (err) {
    console.error("Team membership check failed:", err);
    res.status(500).json({ error: "Server error" });
  }
}
 
module.exports = teamAuthMiddleware;
 