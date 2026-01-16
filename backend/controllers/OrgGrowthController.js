const db = require("../config/db"); 

exports.getOrgGrowth = async (req, res) => {
  try {
    const { type = "yearly" } = req.query;

    let groupBy, label;

    if (type === "monthly") {
      groupBy = "DATE_FORMAT(o.created_at, '%Y-%m')";
      label = "month";
    } else {
      groupBy = "YEAR(o.created_at)";
      label = "year";
    }

    const [rows] = await db.query(`
      SELECT 
        ${groupBy} AS period,
        p.name AS plan,
        COUNT(o.id) AS count
      FROM organizations o
      JOIN plans p ON p.id = o.plan_id
      WHERE o.is_deleted = 0
      GROUP BY period, p.name
      ORDER BY period
    `);

    const result = {};
    const plans = new Set();

    rows.forEach(r => {
      plans.add(r.plan);

      if (!result[r.period]) {
        result[r.period] = { [label]: r.period };
      }

      result[r.period][r.plan.toLowerCase()] = r.count;
    });

    res.json({
      plans: Array.from(plans),
      data: Object.values(result),
    });
  } catch (err) {
    console.error("OrgGrowth error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
