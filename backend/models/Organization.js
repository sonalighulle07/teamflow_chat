const pool = require("../config/db");

class Organization {
  static async getAll() {
    try {
      const [rows] = await pool.query("SELECT id, name FROM organizations ORDER BY name ASC");
      return rows;
    } catch (error) {
      console.error("Error fetching organizations:", error);
      throw error;
    }
  }
}

module.exports = Organization;
