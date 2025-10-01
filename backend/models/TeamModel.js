const db = require("../Utils/db");

const Team = {
  getAll: () => db.query("SELECT * FROM teams"),
  getById: (id) => db.query("SELECT * FROM teams WHERE id=?", [id]),
  create: (name, created_by) =>
    db.query("INSERT INTO teams (name, created_by) VALUES (?, ?)", [name, created_by]),
};

const TeamMember = {
  add: (team_id, user_id, role = "member") =>
    db.query("INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)", [
      team_id,
      user_id,
      role,
    ]),
  getMembers: (team_id) =>
    db.query(
      "SELECT u.id, u.username, u.profile_image FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id=?",
      [team_id]
    ),
};

const TeamChat = {
  getMessages: (team_id) =>
    db.query("SELECT * FROM team_chats WHERE team_id=? ORDER BY created_at ASC", [team_id]),
  addMessage: (team_id, sender_id, message, file_url = null, file_type = "text") =>
    db.query(
      "INSERT INTO team_chats (team_id, sender_id, message, file_url, file_type) VALUES (?, ?, ?, ?, ?)",
      [team_id, sender_id, message, file_url, file_type]
    ),
};

module.exports = { Team, TeamMember, TeamChat };
