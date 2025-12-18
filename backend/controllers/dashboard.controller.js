const { getDashboardCounts } = require("../models/dashboard.model");

exports.getDashboardStats = async (req, res) => {
  try {
    const orgId = req.user.organization_id; // make sure it matches your users table field

    const data = await getDashboardCounts(orgId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Controller Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
