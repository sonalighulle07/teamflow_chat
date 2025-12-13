const pool = require("../config/db");

// =============================
//     ORGANIZATION CONTROLLER
// =============================

// Check domain availability
exports.checkDomain = async (req, res) => {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Domain is required",
      });
    }

    const [existing] = await pool.query(
      "SELECT id FROM organizations WHERE domain = ? LIMIT 1",
      [domain]
    );

    if (existing.length > 0) {
      return res.json({ success: true, available: false });
    }

    res.json({ success: true, available: true });
  } catch (err) {
    console.log("Domain Check Error:", err);
    res.status(500).json({
      success: false,
      available: false,
      message: "Server error",
    });
  }
};

// Create new organization
// SUPER ADMIN - CREATE ORGANIZATION
exports.createOrganization = async (req, res) => {
  try {
    const { name, email, contact, address, admin_user_id } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name & email required",
      });
    }

    // Extract domain from email
    const domain = email.split("@")[1]?.toLowerCase();

    // Domain must exist
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Domain must be unique
    const [existing] = await pool.query(
      "SELECT id FROM organizations WHERE domain = ? LIMIT 1",
      [domain]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Organization domain already exists",
      });
    }

    // Create organization
    const [result] = await pool.query(
      `INSERT INTO organizations 
        (name, address, email, contact, domain, admin_user_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, address || null, email, contact || null, domain, admin_user_id || null, "active"]
    );

    res.json({
      success: true,
      message: "Organization created",
      organization_id: result.insertId,
    });

  } catch (err) {
    console.error("Create Org Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




// Get all organizations
exports.getAllOrganizations = async (req, res) => {
  try {
    let { q = "", page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    // Search filter
    const search = `%${q}%`;

    const [rows] = await pool.query(
      `SELECT * 
       FROM organizations 
       WHERE name LIKE ? 
          OR email LIKE ? 
          OR domain LIKE ?
          OR contact LIKE ?
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [search, search, search, search, limit, offset]
    );

    // Count total
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM organizations 
       WHERE name LIKE ? 
          OR email LIKE ? 
          OR domain LIKE ?
          OR contact LIKE ?`,
      [search, search, search, search]
    );

    res.json({
      success: true,
      organizations: rows,
      total: countRows[0].total,
    });

  } catch (err) {
    console.log("Search Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Get organization details  (ONLY ONE VERSION)
exports.getOrganizationDetails = async (req, res) => {
  try {
    const orgId = req.params.id;

    const [orgRows] = await pool.query(
      "SELECT * FROM organizations WHERE id = ? LIMIT 1",
      [orgId]
    );

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = orgRows[0]; // <-- includes contact field

    // If no admin assigned
    if (!organization.admin_user_id) {
      return res.json({
        success: true,
        organization,
        admin: null
      });
    }

    // Fetch admin details
    const [adminRows] = await pool.query(
      `SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1`,
      [organization.admin_user_id]
    );

    res.json({
      success: true,
      organization,
      admin: adminRows[0] || null
    });

  } catch (err) {
    console.log("Org Details Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// Update organization
// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, contact, address, status } = req.body;

    if (!name || !email || !contact || !address) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Extract domain safely
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Check if new domain already exists for another org
    const [duplicate] = await pool.query(
      `SELECT id FROM organizations 
       WHERE domain = ? AND id != ? 
       LIMIT 1`,
      [domain, id]
    );

    if (duplicate.length > 0) {
      return res.json({
        success: false,
        message: "Another organization already uses this domain",
      });
    }

    // Update
    await pool.query(
      `UPDATE organizations
       SET name = ?, email = ?, contact = ?, address = ?, domain = ?, status = ?
       WHERE id = ?`,
      [name, email, contact, address, domain, status || "active", id]
    );

    res.json({
      success: true,
      message: "Organization updated successfully",
    });

  } catch (err) {
    console.error("Update Organization Error:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};



// Delete organization
exports.deleteOrganization = async (req, res) => {
  const orgId = req.params.id;

  try {
    await pool.query("START TRANSACTION");

    // 1. Delete chats involving users of this org
    await pool.query(`
      DELETE c FROM chats c
      JOIN users u ON c.sender_id = u.id OR c.receiver_id = u.id
      WHERE u.organization_id = ?
    `, [orgId]);

    // 2. Delete team messages
    await pool.query(`
      DELETE tm FROM team_messages tm
      JOIN teams t ON tm.team_id = t.id
      WHERE t.organization_id = ?
    `, [orgId]);

    // 3. Delete team members
    await pool.query(`
      DELETE tm FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE t.organization_id = ?
    `, [orgId]);

    // 4. Delete teams
    await pool.query(`DELETE FROM teams WHERE organization_id = ?`, [orgId]);

    // 5. Delete users
    await pool.query(`DELETE FROM users WHERE organization_id = ?`, [orgId]);

    // 6. Delete organization
    await pool.query(`DELETE FROM organizations WHERE id = ?`, [orgId]);

    await pool.query("COMMIT");

    res.json({
      success: true,
      message: "Organization and all related data deleted successfully",
    });

  } catch (err) {
    console.error("Cascade Delete Error:", err);
    await pool.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};



