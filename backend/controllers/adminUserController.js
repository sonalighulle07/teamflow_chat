const db = require("../config/db");

/**
 * Get all org admins by organization
 */
exports.getOrgAdmins = async (req, res) => {
  try {
    const { orgId } = req.params;

    const [users] = await db.execute(
      `SELECT id, full_name, email, username, contact, role, profile_image, organization_id
       FROM users
       WHERE organization_id = ? 
         AND role = 'org_admin' 
         AND is_deleted = 0`,
      [orgId]
    );

    res.json({ success: true, users });
  } catch (err) {
    console.error("getOrgAdmins error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Get all normal users of an organization (exclude org_admin)
 */
exports.getOrganizationUsers = async (req, res) => {
  try {
    const { orgId } = req.params;

    const [users] = await db.execute(
      `SELECT id, full_name, email, username, contact, role, profile_image, organization_id
       FROM users
       WHERE organization_id = ? 
         AND role = 'user'
         AND is_deleted = 0`,
      [orgId]
    );

    res.json({ success: true, users });
  } catch (err) {
    console.error("getOrganizationUsers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Add new org_admin
 */
exports.addOrgAdmin = async (req, res) => {
  try {
    const { full_name, email, username, contact, organization_id, password } = req.body;

    const [result] = await db.execute(
      `INSERT INTO users (full_name, email, username, contact, role, organization_id, password) 
       VALUES (?, ?, ?, ?, 'org_admin', ?, ?)`,
      [full_name, email, username, contact, organization_id, password]
    );

    res.json({ success: true, message: "Org admin added successfully", userId: result.insertId });
  } catch (err) {
    console.error("addOrgAdmin error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Soft delete user/admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await db.execute(
      `UPDATE users SET is_deleted = 1 WHERE id = ?`,
      [userId]
    );

    res.json({ success: true, message: "User/Admin deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Update user/admin
 */
/**
 * Update user/admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, email, contact, username, role } = req.body;

    if (!full_name || !email || !contact || !username) {
      return res.status(400).json({
        success: false,
        error: "Full Name, Email, Contact, and Username are required.",
      });
    }

    // ✅ ADD THIS
    const allowedRoles = ["user", "org_admin"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role value",
      });
    }

    let query = `
      UPDATE users 
      SET full_name = ?, email = ?, contact = ?, username = ?
    `;
    const params = [full_name, email, contact, username];

    if (role) {
      query += `, role = ?`;
      params.push(role);
    }

    query += ` WHERE id = ?`;
    params.push(userId);

    await db.execute(query, params);

    res.json({ success: true, message: "User/Admin updated successfully" });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

