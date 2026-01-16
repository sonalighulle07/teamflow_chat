const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// Check domain availability
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

// Create organization (Super Admin)
// =============================
exports.createOrganization = async (req, res) => {
  try {
    const { name, email, contact, address, status = "active", plan_id, username, password, role = "org-admin" } = req.body;

    if (!name || !email || !plan_id || !username || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return res.status(400).json({ message: "Invalid email" });

    // check domain exists
    const [existing] = await pool.query(
      "SELECT id FROM organizations WHERE domain=? AND is_deleted=0",
      [domain]
    );
    if (existing.length) return res.status(400).json({ message: "Domain already exists" });

    // insert organization
    const [orgResult] = await pool.query(
      `INSERT INTO organizations (name, email, contact, address, domain, status, plan_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, contact, address, domain, status.toLowerCase(), plan_id]
    );

    const orgId = orgResult.insertId;

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

// insert admin user properly
await pool.query(
  `INSERT INTO users (full_name, email, username, password, role, organization_id, contact)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [name, email, username, hashedPassword, role, orgId, contact]
);


    res.json({ success: true, message: "Organization created successfully" });
  } catch (err) {
    console.error("Create Org Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all organizations
// =============================
exports.getAllOrganizations = async (req, res) => {
  try {
    let { q = "", page = 1, limit = 10, status, plan, startDate, endDate } = req.query;
    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;
    const search = `%${q}%`;

    // Build dynamic WHERE conditions
    let conditions = ["o.is_deleted = 0"];
    let params = [];

    // Search
    if (q) {
      conditions.push("(o.name LIKE ? OR o.email LIKE ? OR o.domain LIKE ? OR o.contact LIKE ?)");
      params.push(search, search, search, search);
    }

    // Status filter
    if (status) {
      const statusArr = status.split(","); // e.g., "active,inactive"
      conditions.push(`o.status IN (${statusArr.map(() => "?").join(",")})`);
      params.push(...statusArr);
    }

    // Plan filter
    if (plan) {
      conditions.push("p.name = ?");
      params.push(plan);
    }

    // Start & end date filter
    if (startDate && endDate) {
      conditions.push("o.created_at BETWEEN ? AND ?");
      params.push(startDate + " 00:00:00", endDate + " 23:59:59");
    } else if (startDate) {
      conditions.push("o.created_at >= ?");
      params.push(startDate + " 00:00:00");
    } else if (endDate) {
      conditions.push("o.created_at <= ?");
      params.push(endDate + " 23:59:59");
    }

    const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    // Fetch organizations with admin username & email
    const [rows] = await pool.query(
      `SELECT 
         o.*, 
         p.name AS plan, 
         u.username AS admin_username, 
         u.email AS admin_email 
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       LEFT JOIN users u ON u.organization_id = o.id AND u.role='org-admin'
       ${whereClause}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Get total count
    const [[count]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      organizations: rows,
      total: count.total,
    });
  } catch (err) {
    console.error("Get Organizations Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get organization details
// =============================
exports.getOrganizationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
         o.name,
         o.email,
         o.contact,
         o.address,
         o.status,
         o.plan_id,
         o.domain,
         COALESCE(o.plan_start_date, p.start_date) AS plan_start_date,
         COALESCE(o.plan_end_date, p.end_date) AS plan_end_date,
         p.name AS plan,
         u.username AS admin_username
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       LEFT JOIN users u ON u.organization_id = o.id AND u.role='org-admin'
       WHERE o.id = ? AND o.is_deleted = 0`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ success: false, message: "Organization not found" });

    res.json({
      success: true,
      organization: { ...rows[0], password: "" }, // password editable but empty
    });
  } catch (err) {
    console.error("Get Organization Details Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      contact,
      address,
      status,
      plan_id,
      plan_start_date,
      plan_end_date,
      plan_is_active,
      username,
      password,
    } = req.body;

    // 0️⃣ Fetch current organization
    const [currentRows] = await pool.query(
      "SELECT email, domain FROM organizations WHERE id=? AND is_deleted=0",
      [id]
    );
    if (!currentRows.length)
      return res.status(404).json({ success: false, message: "Organization not found" });

    const currentOrg = currentRows[0];

    // 1️⃣ Build dynamic organization updates
    const updates = [];
    const params = [];

    if (name) { updates.push("name=?"); params.push(name); }
    if (email) { updates.push("email=?"); params.push(email); } // ✅ email editable

    if (contact !== undefined) { updates.push("contact=?"); params.push(contact || null); }
    if (address !== undefined) { updates.push("address=?"); params.push(address || null); }
    if (status) { updates.push("status=?"); params.push(status.toLowerCase()); }
    if (plan_id !== undefined) { updates.push("plan_id=?"); params.push(plan_id); }
    if (plan_start_date !== undefined) { updates.push("plan_start_date=?"); params.push(plan_start_date); }
    if (plan_end_date !== undefined) { updates.push("plan_end_date=?"); params.push(plan_end_date); }
    if (plan_is_active !== undefined) { updates.push("plan_is_active=?"); params.push(plan_is_active); }

    // ⚠️ Domain NEVER update
    // (domain field removed, email change will not touch domain)

    if (updates.length) {
      const query = `UPDATE organizations SET ${updates.join(", ")} WHERE id=? AND is_deleted=0`;
      params.push(id);
      await pool.query(query, params);
    }

    // 2️⃣ Update admin user if username or password provided
    if (username || password) {
      const userFields = [];
      const userParams = [];

      if (username) { userFields.push("username=?"); userParams.push(username); }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        userFields.push("password=?");
        userParams.push(hashedPassword);
      }

      if (userFields.length) {
        userParams.push(id); // organization_id
        const userQuery = `UPDATE users SET ${userFields.join(", ")} WHERE organization_id=? AND role='org-admin'`;
        await pool.query(userQuery, userParams);
      }
    }

    res.json({ success: true, message: "Organization updated successfully" });
  } catch (err) {
    console.error("Update Organization Error:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};




// Soft delete organization
// =============================
exports.deleteOrganization = async (req, res) => {
  try {
    await pool.query(
      "UPDATE organizations SET is_deleted = 1 WHERE id = ?",
      [req.params.id]
    );

    res.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (err) {
    console.error("Delete Organization Error:", err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

// Dashboard helpers
// =============================
exports.getTotalOrganizations = async (req, res) => {
  const [[{ count }]] = await pool.query(
    "SELECT COUNT(*) AS count FROM organizations WHERE is_deleted = 0"
  );
  res.json({ count });
};


// Get real count of organizations per plan
// ======================================
exports.getOrganizationsByPackage = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.name AS plan_name, COUNT(o.id) AS count
      FROM plans p
      LEFT JOIN organizations o
        ON o.plan_id = p.id AND o.is_deleted = 0
      WHERE p.is_deleted = 0
      GROUP BY p.id, p.name
    `);

    // Map database rows to lowercase keys dynamically
    const data = {};

    rows.forEach((row) => {
      // Use lowercase plan name as key
      const key = row.plan_name.toLowerCase();
      data[key] = row.count;
    });

    // Ensure all expected keys exist even if count is 0
    const defaultKeys = ["starter", "pro", "enterprise", "advanced"];
    defaultKeys.forEach((key) => {
      if (!(key in data)) data[key] = 0;
    });

    res.json(data);
  } catch (err) {
    console.error("getOrganizationsByPackage Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Dashboard - Active & Inactive Organizations
// =============================
exports.getOrganizationActivity = async (req, res) => {
  try {
    // Count active organizations
    const [[{ active }]] = await pool.query(
      "SELECT COUNT(*) AS active FROM organizations WHERE status='active' AND is_deleted=0"
    );

    // Count total organizations
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM organizations WHERE is_deleted=0"
    );

    const inactive = total - active;
    const activePercentage = total ? Math.round((active / total) * 100) : 0;

    res.json({
      totalOrgs: total,
      activeOrgs: active,
      inactiveOrgs: inactive,
      activePercentage,
    });
  } catch (err) {
    console.error("getOrganizationActivity Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


