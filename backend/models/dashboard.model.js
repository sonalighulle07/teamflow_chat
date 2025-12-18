const db = require("../config/db"); // Make sure this exports a valid connection

exports.getDashboardCounts = async (orgId) => {
  try {
    // Users count (exclude deleted users)
    const [[users]] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE organization_id = ? AND is_deleted = 0",
      [orgId]
    );

    // Admins count
    const [[admins]] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE organization_id = ? AND role = 'admin' AND is_deleted = 0",
      [orgId]
    );

    // Teams count
    const [[teams]] = await db.query(
      "SELECT COUNT(*) AS total FROM teams WHERE organization_id = ?",
      [orgId]
    );

    return {
      users: users.total,
      admins: admins.total,
      teams: teams.total,
    };
  } catch (err) {
    console.error("DB error:", err);
    throw err;
  }
};
