const express = require("express");
const router = express.Router();
const { getOrganizations } = require("../controllers/organizationController");

router.get("/", getOrganizations);

module.exports = router;
