const db = require("../config/db");

const Task = {
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM tasks");
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query("SELECT * FROM tasks WHERE id = ?", [id]);
    return rows[0];
  },

  getByUserId: async (userId) => {
    const [rows] = await db.query("SELECT * FROM tasks WHERE assigned_to = ?", [userId]);
    return rows;
  },

  create: async (data) => {
    const { title, assigned_to, assigned_by, status, due_date } = data;
    const [result] = await db.query(
      "INSERT INTO tasks (title, assigned_to, assigned_by, status, due_date) VALUES (?, ?, ?, ?, ?)",
      [title, assigned_to, assigned_by, status, due_date]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { title, assigned_to, status, due_date } = data;
    await db.query(
      "UPDATE tasks SET title=?, assigned_to=?, status=?, due_date=? WHERE id=?",
      [title, assigned_to, status, due_date, id]
    );
    return id;
  },

  delete: async (id) => {
    await db.query("DELETE FROM tasks WHERE id=?", [id]);
    return id;
  },
};

module.exports = Task;
