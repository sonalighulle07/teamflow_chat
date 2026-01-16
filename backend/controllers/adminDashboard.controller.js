const db = require("../config/db");

exports.getAdminDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    /* 1. Get organization of current user */
    const [[org]] = await db.query(
      `SELECT organization_id FROM users WHERE id = ?`,
      [userId]
    );

    if (!org?.organization_id) {
      return res.status(400).json({ message: "Organization not found" });
    }

    const organizationId = org.organization_id;

    /* 2. Messages per day (current week) */
    const [messages] = await db.query(
      `
      SELECT 
        DAYNAME(created_at) AS day,
        COUNT(*) AS value
      FROM chats
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DAY(created_at)
      ORDER BY created_at
      `
    );

    /* 3. Users count */
    const [[totalUsers]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM users
      WHERE organization_id = ? AND is_deleted = 0
      `,
      [organizationId]
    );

    const [[activeUsers]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM users
      WHERE organization_id = ?
      AND status = 'online'
      AND is_deleted = 0
      `,
      [organizationId]
    );

    /* 4. Admin count */
    const [[admins]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM users
      WHERE organization_id = ?
      AND role = 'admin'
      AND is_deleted = 0
      `,
      [organizationId]
    );

    /* 5. Teams count */
    const [[teams]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM teams
      WHERE organization_id = ?
      `,
      [organizationId]
    );

    res.json({
      graphs: {
        weeklyMessages: messages.map(m => ({
          day: m.day[0], // M T W T F
          value: m.value,
        })),
      },
      users: {
        total: totalUsers.count,
        active: activeUsers.count,
        inactive: totalUsers.count - activeUsers.count,
      },
      counts: {
        admins: admins.count,
        teams: teams.count,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard error" });
  }
};




