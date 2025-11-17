const Organization = require("../models/Organization");

exports.getOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.getAll();
    res.status(200).json(orgs);
  } catch (err) {
    console.error("Error fetching organizations:", err);
    res.status(500).json({ message: "Error fetching organizations" });
  }
};
