const express = require("express");
const router = express.Router();

const superAdminController = require("../controllers/superAdminController");
const organizationController = require("../controllers/organizationController");

const { authenticateToken } = require("../middlewares/authMiddleware");
const { superAdminOnly } = require("../middlewares/superAdminMiddleware");

// =======================
// ORGANIZATIONS ROUTES
// =======================

// Check if a domain is available
router.get(
  "/organizations/check-domain",
  authenticateToken,
  superAdminOnly,
  organizationController.checkDomain
);

// Get all organizations with plan and admin info
router.get(
  "/organizations",
  authenticateToken,
  superAdminOnly,
  organizationController.getAllOrganizations
);

// Create a new organization (and org-admin)
router.post(
  "/organizations",
  authenticateToken,
  superAdminOnly,
  organizationController.createOrganization
);

// Update organization details
router.put(
  "/organizations/:id",
  authenticateToken,
  superAdminOnly,
  organizationController.updateOrganization
);

// Soft delete an organization
router.delete(
  "/organizations/:id",
  authenticateToken,
  superAdminOnly,
  organizationController.deleteOrganization
);

// Get single organization details (with plan & admin info)
router.get(
  "/organizations/:id/details",
  authenticateToken,
  superAdminOnly,
  organizationController.getOrganizationDetails
);

// =======================
// DASHBOARD STATS ROUTES
// =======================

// Get total organizations count
router.get(
  "/dashboard/total-organizations",
  authenticateToken,
  superAdminOnly,
  organizationController.getTotalOrganizations
);

// Get organization activity stats
router.get(
  "/dashboard/org-activity",
  authenticateToken,
  superAdminOnly,
  organizationController.getOrganizationActivity
);

// Get organizations grouped by plan
router.get(
  "/dashboard/packages",
  authenticateToken,
  superAdminOnly,
  organizationController.getOrganizationsByPackage
);

// Get total users count
router.get(
  "/dashboard/total-users",
  authenticateToken,
  superAdminOnly,
  superAdminController.getUsersCount // Make sure this function is exported
);

// =======================
// USERS ROUTES
// =======================

// Get all users
router.get(
  "/users",
  authenticateToken,
  superAdminOnly,
  superAdminController.getAllUsers
);

// Create a new user
router.post(
  "/users",
  authenticateToken,
  superAdminOnly,
  superAdminController.createUser
);

// Delete a user
router.delete(
  "/users/:id",
  authenticateToken,
  superAdminOnly,
  superAdminController.deleteUser
);

// Get all organization admins (optional for dashboard)
router.get(
  "/admin-users",
  authenticateToken,
  superAdminOnly,
  superAdminController.getOrganizationAdmins
);

module.exports = router;
