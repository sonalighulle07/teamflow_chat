const pool = require("../config/db");

// =============================
//     ORGANIZATION CONTROLLER
// =============================

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

    const [rows] = await pool.query(
      "SELECT id FROM organizations WHERE domain = ? AND is_deleted = 0 LIMIT 1",
      [domain.toLowerCase()]
    );

    res.json({
      success: true,
      available: rows.length === 0,
    });
  } catch (err) {
    console.error("Domain Check Error:", err);
    res.status(500).json({
      success: false,
      available: false,
      message: "Server error",
    });
  }
};

// -----------------------------
// Create organization
// SUPER ADMIN
// -----------------------------
exports.createOrganization = async (req, res) => {
  try {
    const {
      name,
      email,
      contact,
      address,
      admin_user_id,
      status,
      plan,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name & email required",
      });
    }

    // Extract domain
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Check domain uniqueness
    const [existing] = await pool.query(
      "SELECT id FROM organizations WHERE domain = ? AND is_deleted = 0 LIMIT 1",
      [domain]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Organization domain already exists",
      });
    }

    // Insert organization
    const [result] = await pool.query(
      `INSERT INTO organizations
       (name, email, contact, address, domain, admin_user_id, status, plan, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        name,
        email,
        contact || null,
        address || null,
        domain,
        admin_user_id || null,
        (status || "active").toLowerCase(),
        (plan || "starter").toLowerCase(),
      ]
    );

    res.json({
      success: true,
      message: "Organization created successfully",
      organization_id: result.insertId,
    });
  } catch (err) {
    console.error("Create Organization Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// -----------------------------
// Get all organizations
// -----------------------------
exports.getAllOrganizations = async (req, res) => {
  try {
    let { q = "", page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;
    const search = `%${q}%`;

    const [rows] = await pool.query(
      `SELECT *
       FROM organizations
       WHERE is_deleted = 0
         AND (
           name LIKE ?
           OR email LIKE ?
           OR domain LIKE ?
           OR contact LIKE ?
         )
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [search, search, search, search, limit, offset]
    );

    const [[count]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM organizations
       WHERE is_deleted = 0
         AND (
           name LIKE ?
           OR email LIKE ?
           OR domain LIKE ?
           OR contact LIKE ?
         )`,
      [search, search, search, search]
    );

    res.json({
      success: true,
      organizations: rows,
      total: count.total,
    });
  } catch (err) {
    console.error("Get Organizations Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// -----------------------------
// Get organization details
// -----------------------------
exports.getOrganizationDetails = async (req, res) => {
  try {
    const orgId = req.params.id;

    const [orgRows] = await pool.query(
      "SELECT * FROM organizations WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [orgId]
    );

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = orgRows[0];

    if (!organization.admin_user_id) {
      return res.json({
        success: true,
        organization,
        admin: null,
      });
    }

    const [adminRows] = await pool.query(
      "SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1",
      [organization.admin_user_id]
    );

    res.json({
      success: true,
      organization,
      admin: adminRows[0] || null,
    });
  } catch (err) {
    console.error("Organization Details Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// -----------------------------
// Update organization
// -----------------------------
exports.updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, contact, address, status, plan } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name & email required",
      });
    }

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const [duplicate] = await pool.query(
      `SELECT id FROM organizations
       WHERE domain = ? AND id != ? AND is_deleted = 0
       LIMIT 1`,
      [domain, id]
    );

    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Another organization already uses this domain",
      });
    }

    await pool.query(
      `UPDATE organizations
       SET name = ?, email = ?, contact = ?, address = ?,
           domain = ?, status = ?, plan = ?
       WHERE id = ? AND is_deleted = 0`,
      [
        name,
        email,
        contact || null,
        address || null,
        domain,
        (status || "active").toLowerCase(),
        (plan || "starter").toLowerCase(),
        id,
      ]
    );

    res.json({
      success: true,
      message: "Organization updated successfully",
    });
  } catch (err) {
    console.error("Update Organization Error:", err);
    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

// -----------------------------
// Delete organization (SOFT DELETE)
// -----------------------------
exports.deleteOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;

    await pool.query(
      "UPDATE organizations SET is_deleted = 1 WHERE id = ?",
      [orgId]
    );

    res.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (err) {
    console.error("Delete Organization Error:", err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};


// -----------------------------
// Total Organizations
// -----------------------------
exports.getTotalOrganizations = async (req, res) => {
  try {
    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) AS count FROM organizations WHERE is_deleted = 0"
    );
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// Organization Activity %
// -----------------------------
exports.getOrganizationActivity = async (req, res) => {
  try {
    const [[{ active }]] = await pool.query(
      "SELECT COUNT(*) AS active FROM organizations WHERE status='active' AND is_deleted=0"
    );
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM organizations WHERE is_deleted=0"
    );
    const activePercentage = total ? Math.round((active / total) * 100) : 0;
    res.json({ activePercentage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// Organizations by Package
// -----------------------------
exports.getOrganizationsByPackage = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT plan, COUNT(*) AS count FROM organizations WHERE is_deleted=0 GROUP BY plan"
    );
    const data = { starter: 0, pro: 0, enterprise: 0 };
    rows.forEach(r => { data[r.plan.toLowerCase()] = r.count; });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

