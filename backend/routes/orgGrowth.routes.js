const express = require("express");
const router = express.Router();
const { getOrgGrowth } = require("../controllers/OrgGrowthController");

router.get("/dashboard/org-growth", getOrgGrowth);

module.exports = router;
