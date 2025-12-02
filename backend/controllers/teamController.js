const { Team, TeamMember, TeamMessage } = require("../models/TeamModel");
const db = require("../config/db");
const meetServ = require("./services/groupMeetings");
const TeamInvite = require("../models/TeamInvite");
const path = require("path");
const User = require("../models/User");
const { sendPushNotification } = require("../Utils/pushService");

const createTeam = async (req, res) => {
const { name, created_by, members = [] } = req.body;

if (!name || !created_by) {
return res.status(400).json({ error: "Name and created_by are required" });
}

try {
// 1️⃣ Get creator's organization
const [orgRow] = await db.query(
"SELECT organization_id FROM users WHERE id = ?",
[created_by]
);


const orgId = orgRow[0]?.organization_id;
if (!orgId) {
  return res.status(400).json({ error: "User has no organization" });
}

// 2️⃣ Create team with organization_id
const teamId = await Team.create(name, created_by, orgId);

// 3️⃣ Add creator as owner
await TeamMember.add(teamId, created_by, "owner");

// 4️⃣ Add optional invited members
for (const userId of members) {
  if (userId !== created_by) {
    await TeamInvite.create(teamId, userId, created_by);
  }
}

res.json({ id: teamId, name, created_by, organization_id: orgId });


} catch (err) {
console.error("createTeam failed:", err);
res.status(500).json({ error: "Failed to create team" });
}
};

const renameTeam = async (req, res) => {
  const { teamId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) return res.status(400).json({ error: "Team name required" });

  try {
    // Check user role
    const [rows] = await db.query(
      "SELECT role FROM team_members WHERE team_id=? AND user_id=?",
      [teamId, userId]
    );

    if (!rows.length || !["owner", "admin"].includes(rows[0].role)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await db.query("UPDATE teams SET name=? WHERE id=?", [name, teamId]);

    res.json({ success: true, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Rename failed" });
  }
};
const deleteTeam = async (req, res) => {
  const { teamId } = req.params;

  try {
    // 1. Delete team_members first
    await db.query("DELETE FROM team_members WHERE team_id = ?", [teamId]);

    // 2. Delete team
    await db.query("DELETE FROM teams WHERE id = ?", [teamId]);

    res.json({ success: true, message: "Team deleted" });
  } catch (err) {
    console.error("Delete team error:", err);
    res.status(500).json({ error: "Failed to delete team" });
  }
};


// Send Invites
const sendTeamInvites = async (req, res) => {
  const { teamId, members, teamName } = req.body;
  const createdBy = req.user.id;

  if (!members?.length)
    return res.status(400).json({ error: "No members to invite" });

  try {
    for (const userId of members) {
      await TeamInvite.create(teamId, userId, createdBy);
      req.io?.to(`user_${userId}`).emit("teamInviteReceived", {
        id: Date.now(),
        teamId,
        team_name: teamName,
        invited_by_name: req.user.username,
      });
    }
    res.json({ message: "Invites sent successfully" });
  } catch (err) {
    console.error(" sendTeamInvites:", err);
    res.status(500).json({ error: "Failed to send invites" });
  }
};

// Get Pending Invites
const getPendingInvites = async (req, res) => {
  try {
    const invites = await TeamInvite.getPendingForUser(req.user.id);
    res.json(invites);
  } catch (err) {
    console.error(" getPendingInvites:", err);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
};

// Respond to Invite
const respondToInvite = async (req, res) => {
  const { inviteId, action } = req.body;
  const userId = req.user.id;

  try {
    await TeamInvite.respond(inviteId, action);
    const [rows] = await db.query("SELECT team_id FROM team_invites WHERE id=?", [inviteId]);
    const invite = rows[0];

    if (action === "accept" && invite) {
      await TeamMember.add(invite.team_id, userId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(" respondToInvite:", err);
    res.status(500).json({ error: "Failed to respond to invite" });
  }
};

const getAllTeams = async (req, res) => {
  try {
    const [teams] = await Team.getAll();
    res.json(teams);
  } catch (err) {
    console.error("Failed to fetch teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
};

// GET teams for a user
const getUserTeams = async (req, res) => {
const userId = req.query.userId;
if (!userId) {
return res.status(400).json({ error: "Missing userId in query" });
}

try {
const [teams] = await db.query(
`SELECT t.*
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       JOIN users u ON u.organization_id = t.organization_id
       WHERE tm.user_id = ?
       AND u.id = ?`,
[userId, userId]
);
res.json(teams);

} catch (err) {
console.error("Failed to fetch user teams:", err);
res.status(500).json({ error: "Failed to fetch teams" });
}
};




// UPDATE a team
const updateTeam = async (req, res) => {
  const { teamId } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Team name is required" });

  try {
    await Team.update(teamId, name);
    res.json({ teamId, name });
  } catch (err) {
    console.error("Failed to update team:", err);
    res.status(500).json({ error: "Failed to update team" });
  }
};
const getTeamById = async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.getById(teamId);  // <-- correct, no []

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json(team);  // send full team object with created_by
  } catch (err) {
    console.error("Failed to fetch team:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};





// ADD member to a team
const addTeamMember = async (req, res) => {
  const { teamId } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "User ID is required" });

  try {
    await TeamMember.add(teamId, user_id);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to add member:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
};

// GET members of a team
const getTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  // console.log("getTeamMembers called with team ID:", teamId);
  try {
    const members = await TeamMember.getMembers(teamId);
    res.json(members);
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
};
const removeMember = async (req, res) => {
  const { teamId, memberId } = req.params;
  const currentUserId = req.user.id;

  try {
    // 1. Verify team exists and owner
    const [teamRows] = await db.query("SELECT created_by AS owner_id FROM teams WHERE id = ?", [teamId]);
    const team = teamRows[0];
    if (!team) return res.status(404).json({ error: "Team not found" });

    // Only owner (or admin if you prefer) can remove — change check if admin allowed
    if (team.owner_id !== currentUserId) {
      return res.status(403).json({ error: "Only owner can remove members" });
    }

    // Prevent owner from removing themself (optional)
    if (parseInt(memberId) === parseInt(team.owner_id)) {
      return res.status(400).json({ error: "Owner cannot be removed" });
    }

    // 2. Delete member from team_members
    const [deleteRes] = await db.query(
      "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
      [teamId, memberId]
    );

    if (deleteRes.affectedRows === 0) {
      return res.status(400).json({ error: "User not found in team" });
    }

    // 3. Optionally delete pending invites for that user/team
    await db.query("DELETE FROM team_invites WHERE team_id = ? AND user_id = ?", [teamId, memberId]).catch(() => {});

    // 4. Emit socket events
    // Notify removed user personally, so their UI removes the team
    req.io?.to(`user_${memberId}`).emit("removedFromTeam", { teamId });

    // Broadcast to team room that member removed (so other members update UI)
    req.io?.to(`team_${teamId}`).emit("memberRemoved", { teamId, memberId });

    return res.json({ success: true, memberId, teamId });
  } catch (err) {
    console.error("removeMember failed:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
}; 

// GET team messages
const getTeamMessages = async (req, res) => {
  const { teamId } = req.params;
  try {
    const messages = await TeamMessage.getMessages(teamId); // uses model decrypt
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch team messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

const sendTeamMessage = async (req, res) => {
  const teamId = req.params.teamId;
  console.log("sendTeamMessage called for teamId:", teamId);
  const senderId = req.user?.id;
  const { text, type } = req.body; // include metadata
  const file = req.file;

  if (!senderId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    let fileUrl = null;
    let fileName = null;
    let msgType = type || "text";

    if (file) {
      fileUrl = `/uploads/${file.filename}`;
      fileName = file.originalname;

      // Infer message type from file mimetype if not provided
      const mime = file.mimetype || "";
      if (mime.startsWith("image/")) msgType = "image";
      else if (mime.startsWith("video/")) msgType = "video";
      else if (mime.startsWith("audio/")) msgType = "audio";
      else msgType = "file";
    }

    const result = await TeamMessage.insert(
      senderId,
      teamId,
      text || "",
      fileUrl,
      msgType,
      fileName,
    
    );
    const newMessage = {
      id: result.insertId,
      team_id: teamId,
      sender_id: senderId,
      text: text || "",
      file_url: fileUrl,
      file_name: fileName,
      type: msgType,
      created_at: new Date(),
    };

    // Emit message to all connected members of the team
    if (req.io) {
      req.io.to(`team_${teamId}`).emit("teamMessage", newMessage);
    }
    try {
      const sender = await User.findById(senderId);
      const teamMembers = await TeamMember.getMembers(teamId); 

      console.log("Team members for notifications:", teamMembers);

      for (const member of teamMembers) {
        if (member.user_id === senderId) continue; 

        const subscription = await User.getPushSubscription(member.user_id);
        if (subscription) {
          await sendPushNotification(subscription, {
            title: `👥👥 Team Message (${member.team_name})`,
            body: text
              ? `💬 ${sender.username}: ${text}`
              : fileUrl
              ? `📎 ${sender.username} sent a ${msgType} file`
              : `${sender.username} sent a message in your team`,
            icon: "/icons/team.png",
          });
        }
      }
    } catch (pushErr) {
      console.error("Team push notification failed:", pushErr);
    }

    res.json(newMessage);
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// EDIT team message
const editTeamMessage = async (req, res) => {
  const { teamId, messageId } = req.params;
  const { text } = req.body;
  const file = req.file;

  try {
    let fileUrl = null;
    let fileName = null;
    let msgType = null;

    if (file) {
      fileUrl = `/uploads/${file.filename}`;
      fileName = file.originalname;

      if (file.mimetype.startsWith("image/")) msgType = "image";
      else if (file.mimetype.startsWith("video/")) msgType = "video";
      else if (file.mimetype.startsWith("audio/")) msgType = "audio";
      else msgType = "file";
    }

    await TeamMessage.updateMessage(messageId, {
      text,
      fileUrl,
      fileName,
      type: msgType,
    });

    const updatedMsg = await TeamMessage.getById(messageId);

    req.io?.to(`team_${teamId}`).emit("messageEdited", updatedMsg);

    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    console.error(" Failed to edit team message:", err);
    res.status(500).json({ error: "Failed to edit team message" });
  }
};

// DELETE team message
const deleteTeamMessage = async (req, res) => {
  const { teamId, messageId } = req.params;
  try {
    const before = await TeamMessage.getById(messageId);
    await TeamMessage.deletePermanent(messageId);
    req.io?.to(`team_${teamId}`).emit("messageDeleted", {
      messageId,
      senderId: before?.sender_id,
      teamId,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};


// UPDATE reactions on team message
const reactMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id;

    if (!emoji || !userId) {
      return res.status(400).json({ error: "Emoji and userId are required" });
    }

    // Fetch current reactions from DB (decrypt first if using encrypted_reactions)
    const [rows] = await db.execute(
      "SELECT reactions FROM team_messages WHERE id = ?",
      [messageId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Message not found" });
    }

    let reactions = {};
    try {
      reactions = rows[0].reactions ? JSON.parse(rows[0].reactions) : {};
      // If using encrypted_reactions:
      // reactions = rows[0].encrypted_reactions ? JSON.parse(decrypt(rows[0].encrypted_reactions)) : {};
    } catch (e) {
      reactions = {};
    }

    // Ensure emoji key exists
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: {} };
    }

    const emojiData = reactions[emoji];

    // Toggle reaction: add or remove
    if (emojiData.users[userId]) {
      delete emojiData.users[userId]; 
    } else {
      emojiData.users[userId] = 1; 
    }

    // Update total count
    emojiData.count = Object.values(emojiData.users).reduce((sum, c) => sum + c, 0);

    // Save updated reactions (encrypt before saving if needed)
    await db.execute(
      "UPDATE team_messages SET reactions = ? WHERE id = ?",
      [JSON.stringify(reactions), messageId]
      // If using encryption:
      // [encrypt(JSON.stringify(reactions)), messageId]
    );

    // Return updated reactions
    res.json({ reactions });

    // Emit real-time update
    if (req.io) {
      req.io.emit("reaction", { messageId, reactions });
    }
  } catch (err) {
    console.error("Failed to react to message:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET or CREATE meeting link for a team
const getTeamMeetingLink = async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user?.id || null; 

  console.log(" getTeamMeetingLink called with:", { teamId, userId });

  if (!teamId) {
    return res.status(400).json({ error: "teamId is required" });
  }

  try {
    console.log("calling service");
    const { meetingCode, status } = await meetServ.getOrCreateMeetingCode(teamId, userId);

    console.log(" Meeting code fetched/created:", meetingCode);

    const baseUrl = process.env.APP_URL || "http://localhost:5173";
    const meetingUrl = `${baseUrl}/prejoin/${meetingCode}`;

    return res.json({ teamId, meetingCode, meetingUrl, status });
  } catch (err) {
    console.error(" Failed to fetch/create meeting link:", err);
    return res.status(500).json({ error: "Failed to fetch/create meeting link" });
  }
};

const createTeamAndSendInvites = async (teamName, selectedUserIds, currentUserId) => {

  const team = await Team.create(teamName, currentUserId);

  // 2️ Send invites (direct DB insertion)
  for (const userId of selectedUserIds) {
    if (userId !== currentUserId) { 
      await TeamInvite.create(team.id, userId, currentUserId);
    }
  }

  return team;
};

// GET teams sorted by latest message
const getTeamsSortedByActivity = async (req, res) => {
  const userId = req.params.userId; 
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const teams = await Team.getTeamsWithLastMessage(userId);
    res.json(teams);
  } catch (err) {
    console.error("Failed to fetch sorted teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
};
const addTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  const { members = [] } = req.body;
  const currentUserId = req.user.id;

  if (!members.length) {
    return res.status(400).json({ error: "No members provided" });
  }

  try {
    // 🚨 0. PERMISSION CHECK — only owner/admin can add new members
    const userRole = await TeamMember.getRole(teamId, currentUserId);

    if (userRole !== "owner" && userRole !== "admin") {
      return res.status(403).json({ error: "Only admin can add members" });
    }

    // 1. get existing members
    const existing = await TeamMember.getMembers(teamId);
    const existingRows = Array.isArray(existing[0]) ? existing[0] : existing;
    const existingIds = existingRows.map((m) => m.user_id);

    // 2. filter new
    const toInvite = members.filter((id) => !existingIds.includes(id));

    if (!toInvite.length) {
      return res.json({ message: "No new members to invite" });
    }

    // 3. get team name safely
    const teamRes = await Team.getById(teamId);
    const teamRows = Array.isArray(teamRes[0]) ? teamRes[0] : teamRes;
    const teamName =
      Array.isArray(teamRows) && teamRows.length > 0
        ? teamRows[0].name
        : "Team";

    // 4. send invites
    for (const uid of toInvite) {
      await TeamInvite.create(teamId, uid, currentUserId);

      req.io?.to(`user_${uid}`).emit("teamInviteReceived", {
        id: Date.now(),
        teamId,
        team_name: teamName,
        invited_by_name: req.user.username,
      });
    }

    return res.json({ success: true, invited: toInvite });
  } catch (err) {
    console.error("addTeamMembers failed:", err);
    return res.status(500).json({ error: "Failed to add members" });
  }
};
module.exports = {
   sendTeamInvites,
  getPendingInvites,
  respondToInvite,
  getAllTeams,
  getUserTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  getTeamMembers,
  getTeamMessages,
  sendTeamMessage,
  editTeamMessage,
  deleteTeamMessage,
  reactMessage,
  getTeamMeetingLink,
  createTeamAndSendInvites,
  getTeamsSortedByActivity ,
  addTeamMembers,
  removeMember,
  renameTeam,

};


