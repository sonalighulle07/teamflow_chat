const express = require("express");
const router = express.Router();

const planController = require("../controllers/planController");

// Routes order matters: specific routes first, then dynamic params

// Create plan
router.post("/create", planController.createPlan);

// List all plans
router.get("/list", planController.getPlans);

// Get package growth (chart)
// router.get("/growth", planController.getPackageGrowth);

// Update plan
router.put("/update/:id", planController.updatePlan);

// Soft delete plan
router.delete("/delete/:id", planController.deletePlan);


router.get("/names", planController.getPlanNames);

// Get single plan by ID
router.get("/:id", planController.getPlanById);
// Export router
module.exports = router;
