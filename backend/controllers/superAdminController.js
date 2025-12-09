const pool = require("../config/db");
const bcrypt = require("bcrypt");

//   GET ONLY ORGANIZATION ADMINS
// =============================
exports.getOrganizationAdmins = async (req, res) => {
  try {
    const q = req.query.q || "";

    const [rows] = await pool.query(
  `
  SELECT 
    users.id,
    users.full_name AS name,
    users.email,
    users.contact AS phone,
    organizations.id AS org_id,
    organizations.name AS organization_name
  FROM users
  LEFT JOIN organizations ON organizations.id = users.organization_id
  WHERE users.role = 'org_admin'
  AND users.full_name LIKE ?
  ORDER BY users.id DESC
  `,
  [`%${q}%`]
);


    res.json({ success: true, admins: rows });
  } catch (err) {
    console.log("Admin Fetch Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, username, role, organization_id FROM users ORDER BY id DESC"
    );

    res.json({ success: true, users: rows });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const { full_name, email, username, password, role, organization_id } =
      req.body;

    if (!full_name || !email || !username || !password || !role) {
      return res.json({ success: false, message: "All fields required" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users 
       (full_name, email, username, password, role, organization_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, username, hashed, role, organization_id]
    );

    res.json({
      success: true,
      message: "User created successfully",
      user_id: result.insertId,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
