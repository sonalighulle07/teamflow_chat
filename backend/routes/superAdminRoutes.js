const express = require("express");
const router = express.Router();

const superAdminController = require("../controllers/superAdminController");
const organizationController = require("../controllers/organizationController");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { superAdminOnly } = require("../middlewares/superAdminMiddleware");

//  =========================    ORGANIZATION ROUTES  =========================

router.get("/organizations/check-domain",authenticateToken,superAdminOnly,organizationController.checkDomain);

router.get("/organizations",authenticateToken,superAdminOnly,organizationController.getAllOrganizations);

router.post("/organizations",authenticateToken,superAdminOnly,organizationController.createOrganization);

router.put("/organizations/:id",authenticateToken,superAdminOnly,organizationController.updateOrganization);

router.delete("/organizations/:id",authenticateToken, superAdminOnly, organizationController.deleteOrganization);

router.get("/organizations/:id/details",authenticateToken,superAdminOnly,organizationController.getOrganizationDetails);


//====================  USERS   ====================

router.get("/users",authenticateToken,superAdminOnly,superAdminController.getAllUsers);

router.post( "/users",authenticateToken,superAdminOnly,superAdminController.createUser);

router.delete("/users/:id",authenticateToken, superAdminOnly,superAdminController.deleteUser);

// GET only organization admins
router.get( "/admin-users",authenticateToken,superAdminOnly,superAdminController.getOrganizationAdmins);

module.exports = router;
