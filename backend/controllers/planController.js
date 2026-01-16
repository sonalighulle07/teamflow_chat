const {
  createPlanDB,
  getPlansDB,
  updatePlanDB,
  softDeletePlanDB,
  getPlanByIdDB,
  getPlanNamesDB,
} = require("../models/planModel");

const db = require("../config/db");

// =======================
// Helper functions
// =======================
const getToday = () => new Date().toISOString().split("T")[0];

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split("T")[0];
};

// =======================
// CREATE PLAN
// =======================
const createPlan = async (req, res) => {
  try {
    const { name, days, price, size } = req.body;

    if (!name || !days || !price || !size) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const startDate = getToday();
    const endDate = addDays(days);

    await createPlanDB(name, days, price, size, startDate, endDate);

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// GET PLANS
// =======================
const getPlans = async (req, res) => {
  try {
    const [plans] = await getPlansDB();

    const filteredPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      days: plan.days,
      price: plan.price,
      size: plan.size,
    }));

    res.json({ success: true, data: filteredPlans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// UPDATE PLAN
// =======================
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, days, price, size } = req.body;

    if (!name || !days || !price || !size) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const endDate = addDays(days);

    await updatePlanDB(id, name, days, price, size, endDate);

    res.json({
      success: true,
      message: "Plan updated successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// DELETE PLAN (SOFT DELETE)
// =======================
const deletePlan = async (req, res) => {
  try {
    await softDeletePlanDB(req.params.id);

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// GET SINGLE PLAN
// =======================
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await getPlanByIdDB(id);

    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// GET PLAN NAMES
// =======================
const getPlanNames = async (req, res) => {
  try {
    const [rows] = await getPlanNamesDB();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// EXPORTS
// =======================
module.exports = {
  createPlan,
  getPlans,
  updatePlan,
  deletePlan,
  getPlanById,
  getPlanNames,
};
