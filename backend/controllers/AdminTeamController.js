const db = require("../config/db");

// Get teams in the same org where a given org_admin is a member
exports.getOrgTeams = async (req, res) => {
  const orgId = req.params.orgId; // organization id
  const adminId = req.params.adminId; // user id of org_admin

  try {
    const [teams] = await db.execute(
      `SELECT t.id, t.name
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE t.organization_id = ?
         AND tm.user_id = ?
         AND tm.role = 'admin'
         AND tm.team_id IS NOT NULL`,
      [orgId, adminId]
    );
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete team
exports.deleteTeam = async (req, res) => {
  const teamId = req.params.teamId;
  try {
    await db.execute(`DELETE FROM teams WHERE id=?`, [teamId]);
    res.json({ message: "Team deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// Edit team
exports.editTeam = async (req, res) => {
  const teamId = req.params.teamId;
  const { name } = req.body;
  try {
    await db.execute(`UPDATE teams SET name=? WHERE id=?`, [name, teamId]);
    res.json({ message: "Team updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
