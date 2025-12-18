const express = require("express");
const router = express.Router();
const AdminTeamController = require("../controllers/AdminTeamController");

// Teams (organization-wise)
router.get("/org/:orgId", AdminTeamController.getOrgTeams);
router.put("/team/:teamId", AdminTeamController.editTeam);
router.delete("/team/:teamId", AdminTeamController.deleteTeam);

module.exports = router;
