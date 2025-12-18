const express = require("express");
const router = express.Router();
const adminUserController = require("../controllers/adminUserController");

// Organization admins
router.get("/org/:orgId/admins", adminUserController.getOrgAdmins);

// Organization users
router.get("/org/:orgId/users", adminUserController.getOrganizationUsers);

// User actions (admin / user)
router.put("/user/:userId", adminUserController.updateUser);
router.delete("/user/:userId", adminUserController.deleteUser);

module.exports = router;
