const db = require("../config/db");

// =======================
// CREATE PLAN
// =======================
const createPlanDB = async (name, days, price, size, startDate, endDate) => {
  const sql = `
    INSERT INTO plans
    (name, days, price, size, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  return db.execute(sql, [name, days, price, size, startDate, endDate]);
};

// =======================
// GET PLANS (only not deleted)
// =======================
const getPlansDB = async () => {
  const sql = `
    SELECT id, name, days, price, size
    FROM plans
    WHERE is_deleted = 0
    ORDER BY created_at DESC
  `;
  return db.execute(sql);
};

// =======================
// UPDATE PLAN
// =======================
const updatePlanDB = async (id, name, days, price, size, endDate) => {
  const sql = `
    UPDATE plans
    SET
      name = ?,
      days = ?,
      price = ?,
      size = ?,
      end_date = ?
    WHERE id = ? AND is_deleted = 0
  `;
  return db.execute(sql, [name, days, price, size, endDate, id]);
};

// =======================
// SOFT DELETE PLAN
// =======================
const softDeletePlanDB = async (id) => {
  const sql = `
    UPDATE plans
    SET is_deleted = 1
    WHERE id = ?
  `;
  return db.execute(sql, [id]);
};

// =======================
// GET PLAN BY ID
// =======================
const getPlanByIdDB = async (id) => {
  
  const sql = `
    SELECT id, name, days, price, size, start_date, end_date
    FROM plans
    WHERE id = ? AND is_deleted = 0
  `;
  const [rows] = await db.execute(sql, [id]);
  return rows[0] || null;
};

// =======================
// GET ONLY PLAN NAMES
// =======================
const getPlanNamesDB = async () => {
  const sql = `
    SELECT id, name
    FROM plans
    WHERE is_deleted = 0
    ORDER BY name ASC
  `;
  return db.execute(sql);
};

// =======================
// EXPORTS
// =======================
module.exports = {
  createPlanDB,
  getPlansDB,
  updatePlanDB,
  softDeletePlanDB,
  getPlanByIdDB,
  getPlanNamesDB,
};
