// routes/teamRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../Utils/db");

// -----------------------
// GET all teams
// -----------------------
router.get("/", async (req, res) => {
  try {
    const [teams] = await db.query("SELECT * FROM teams ORDER BY created_at DESC");
    res.json(teams);
  } catch (err) {
    console.error("Failed to fetch teams:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// -----------------------
// GET single team by ID
// -----------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [team] = await db.query("SELECT * FROM teams WHERE id = ?", [id]);
    if (!team.length) return res.status(404).json({ error: "Team not found" });
    res.json(team[0]);
  } catch (err) {
    console.error("Failed to fetch team:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

// -----------------------
// CREATE a new team
// -----------------------
router.post("/", async (req, res) => {
  const { name, created_by, members } = req.body;

  if (!name || !created_by) {
    return res.status(400).json({ error: "Name and created_by are required" });
  }

  try {
    // Insert into teams table
    const [result] = await db.query(
      "INSERT INTO teams (name, created_by) VALUES (?, ?)",
      [name, created_by]
    );
    const teamId = result.insertId;

    // Insert members into team_members table
    if (members && members.length > 0) {
      const values = members.map((userId) => [teamId, userId]);
      await db.query("INSERT INTO team_members (team_id, user_id) VALUES ?", [values]);
    }

    res.json({ id: teamId, name, created_by, members: members || [] });
  } catch (err) {
    console.error("Failed to create team:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// -----------------------
// UPDATE a team
// -----------------------
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "Team name is required" });

  try {
    await db.query("UPDATE teams SET name = ? WHERE id = ?", [name, id]);
    res.json({ id, name });
  } catch (err) {
    console.error("Failed to update team:", err);
    res.status(500).json({ error: "Failed to update team" });
  }
});

// -----------------------
// DELETE a team
// -----------------------
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM teams WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete team:", err);
    res.status(500).json({ error: "Failed to delete team" });
  }
});

// -----------------------
// ADD member to a team
// -----------------------
router.post("/:id/members", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) return res.status(400).json({ error: "User ID is required" });

  try {
    await db.query("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", [id, user_id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to add member:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// -----------------------
// GET members of a team
// GET members of a team
router.get("/:id/members", async (req, res) => {
  const { id } = req.params;
  try {
    const [members] = await db.query(
      `SELECT u.id, u.username, u.profile_image
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?`,
      [id]
    );
    res.json(members);
  } catch (err) {
    console.error("Failed to fetch team members:", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

module.exports = router;
