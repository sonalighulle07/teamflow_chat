
const { Team, TeamMember, TeamMessage } = require("../models/TeamModel");
const db = require("../config/db");
const meetServ = require("./services/groupMeetings");
const TeamInvite = require("../models/TeamInvite");

const path = require("path");
const User = require("../models/User");
const { sendPushNotification } = require("../Utils/pushService");


const createTeam = async (req, res) => {
  const { name, created_by, members = [] } = req.body;

  if (!name || !created_by)
    return res.status(400).json({ error: "Name and created_by are required" });

  try {
    // 1️⃣ Create team
    const teamId = await Team.create(name, created_by);
    console.log("✅ Team created:", teamId);

    // 2️⃣ Add creator as member
    await TeamMember.add(teamId, created_by, "owner");

    // 3️⃣ Add optional members
    if (members.length > 0) {
      for (const userId of members) {
        if (userId !== created_by) {
          await TeamInvite.create(teamId, userId, created_by);
        }
      }
    }

    // 4️⃣ Meeting creation
    await meetServ.getOrCreateMeetingCode(teamId);

    res.json({ id: teamId, name, created_by });
  } catch (err) {
    console.error("❌ createTeam failed:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
};

// -----------------------
// Send Invites
// -----------------------
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
    console.error("❌ sendTeamInvites:", err);
    res.status(500).json({ error: "Failed to send invites" });
  }
};

// -----------------------
// Get Pending Invites
// -----------------------
const getPendingInvites = async (req, res) => {
  try {
    const invites = await TeamInvite.getPendingForUser(req.user.id);
    res.json(invites);
  } catch (err) {
    console.error("❌ getPendingInvites:", err);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
};

// -----------------------
// Respond to Invite
// -----------------------
const respondToInvite = async (req, res) => {
  const { inviteId, action } = req.body;
  const userId = req.user.id;

  try {
    // Update status
    await TeamInvite.respond(inviteId, action);

    // If accepted, add user to team
    const [rows] = await db.query("SELECT team_id FROM team_invites WHERE id=?", [inviteId]);
    const invite = rows[0];

    if (action === "accept" && invite) {
      await TeamMember.add(invite.team_id, userId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ respondToInvite:", err);
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

// -----------------------
// GET teams for a user
// -----------------------
const getUserTeams = async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId in query" });

  try {
    const teams = await Team.getByUser(userId); // remove extra destructuring
    res.json(teams);
  } catch (err) {
    console.error("Failed to fetch user teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
};


// -----------------------
// GET single team by ID
// -----------------------
const getTeamById = async (req, res) => {
  console.log("getTeamById called with params:", req.params);
  const { teamId } = req.params;
  try {
    const [team] = await Team.getById(teamId);
    if (!team.length) return res.status(404).json({ error: "Team not found" });
    res.json(team[0]);
  } catch (err) {
    console.error("Failed to fetch team:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
};




// -----------------------
// UPDATE a team
// -----------------------
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

// -----------------------
// DELETE a team
// -----------------------
const deleteTeam = async (req, res) => {
  const { teamId } = req.params;
  try {
    await Team.delete(teamId);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete team:", err);
    res.status(500).json({ error: "Failed to delete team" });
  }
};

// -----------------------
// ADD member to a team
// -----------------------
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

// -----------------------
// GET members of a team
// -----------------------
const getTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  console.log("getTeamMembers called with team ID:", teamId);
  try {
    const members = await TeamMember.getMembers(teamId);
    res.json(members);
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
};

// -----------------------
// GET team messages
// -----------------------
const getTeamMessages = async (req, res) => {
  const { teamId } = req.params;
  try {
    const [messages] = await db.query(
      "SELECT * FROM team_messages WHERE team_id = ? ORDER BY created_at ASC",
      [teamId]
    );
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch team messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// // -----------------------
// // SEND team message (with file support + metadata)
// // -----------------------
// const sendTeamMessage = async (req, res) => {
//   const teamId = req.params.teamId;
//   const senderId = req.user?.id;
//   const { text, type, metadata } = req.body; // include metadata

//   const file = req.file;

//   if (!senderId) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     let fileUrl = null;
//     let fileName = null;

//     if (file) {
//       fileUrl = `/uploads/${file.filename}`;
//       fileName = file.originalname;
//     }

//     // Insert message into DB
//     const result = await TeamMessage.insert(
//       senderId,
//       teamId,
//       text || "",
//       fileUrl,
//       type || (file ? "file" : "text"),
//       fileName,
//       metadata || null
//     );

//     res.json({
//       id: result.insertId,
//       team_id: teamId,
//       sender_id: senderId,
//       text: text || "",
//       file_url: fileUrl,
//       file_name: fileName,
//       type: type || (file ? "file" : "text"),
//       metadata: metadata || null,
//       created_at: new Date(),
//     });
//   } catch (err) {
//     console.error("Failed to send message:", err);
//     res.status(500).json({ error: "Failed to send message" });
//   }
// };

// -----------------------
// SEND team message (with file support + metadata + notifications)
// -----------------------
const sendTeamMessage = async (req, res) => {
  const teamId = req.params.teamId;
  console.log("sendTeamMessage called for teamId:", teamId);
  const senderId = req.user?.id;
  const { text, type, metadata } = req.body; // include metadata
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

    // Insert message into DB
    const result = await TeamMessage.insert(
      senderId,
      teamId,
      text || "",
      fileUrl,
      msgType,
      fileName,
      metadata || null
    );

    const newMessage = {
      id: result.insertId,
      team_id: teamId,
      sender_id: senderId,
      text: text || "",
      file_url: fileUrl,
      file_name: fileName,
      type: msgType,
      metadata: metadata || null,
      created_at: new Date(),
    };

    // Emit message to all connected members of the team
    if (req.io) {
      req.io.to(`team_${teamId}`).emit("teamMessage", newMessage);
    }

    // Push notifications to team members
    try {
      const sender = await User.findById(senderId);
      const teamMembers = await TeamMember.getMembers(teamId); // ⬅️ implement this in your Team model

      console.log("Team members for notifications:", teamMembers);

      for (const member of teamMembers) {
        if (member.user_id === senderId) continue; // skip sender

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




// -----------------------
// EDIT team message
// -----------------------
const editTeamMessage = async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;
  try {
    await TeamMessage.updateText(messageId, text);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to edit message:", err);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// -----------------------
// DELETE team message
// -----------------------
const deleteTeamMessage = async (req, res) => {
  console.log("Delete team msg")
  const { messageId } = req.params;
  try {
    await TeamMessage.deletePermanent(messageId);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete message:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// -----------------------
// UPDATE reactions on team message
// -----------------------
const updateTeamMessageReactions = async (req, res) => {
  const { messageId } = req.params;
  const { reactions } = req.body;
  try {
    await TeamMessage.updateReactions(messageId, JSON.stringify(reactions));
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update reactions:", err);
    res.status(500).json({ error: "Failed to update reactions" });
  }
};


// -----------------------
// GET or CREATE meeting link for a team
// -----------------------
const getTeamMeetingLink = async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user?.id || null; // ✅ get user from auth middleware

  console.log("📡 getTeamMeetingLink called with:", { teamId, userId });

  if (!teamId) {
    return res.status(400).json({ error: "teamId is required" });
  }

  try {
    console.log("calling service");
    const { meetingCode, status } = await meetServ.getOrCreateMeetingCode(teamId, userId);

    console.log("✅ Meeting code fetched/created:", meetingCode);

    const baseUrl = process.env.APP_URL || "http://localhost:5173";
    const meetingUrl = `${baseUrl}/prejoin/${meetingCode}`;

    return res.json({ teamId, meetingCode, meetingUrl, status });
  } catch (err) {
    console.error("❌ Failed to fetch/create meeting link:", err);
    return res.status(500).json({ error: "Failed to fetch/create meeting link" });
  }
};

const createTeamAndSendInvites = async (teamName, selectedUserIds, currentUserId) => {
  // 1️⃣ Create team in DB
  const team = await Team.create(teamName, currentUserId);

  // 2️⃣ Send invites (direct DB insertion)
  for (const userId of selectedUserIds) {
    if (userId !== currentUserId) { // skip self
      await TeamInvite.create(team.id, userId, currentUserId);
    }
  }

  return team;
};
// -----------------------
// GET teams sorted by latest message
// -----------------------
const getTeamsSortedByActivity = async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId in query" });

  try {
    // Fetch all teams for this user and sort by latest message
    const [teams] = await db.query(
      `SELECT t.id, t.name, t.created_by, t.created_at, 
              MAX(tm.created_at) AS last_message_time
       FROM teams t
       JOIN team_members tmbr ON tmbr.team_id = t.id
       LEFT JOIN team_messages tm ON tm.team_id = t.id
       WHERE tmbr.user_id = ?
       GROUP BY t.id
       ORDER BY last_message_time DESC, t.created_at DESC`,
      [userId]
    );

    res.json(teams);
  } catch (err) {
    console.error("Failed to fetch sorted teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
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
  updateTeamMessageReactions,
  getTeamMeetingLink,
   createTeamAndSendInvites,
    getTeamsSortedByActivity 
};


