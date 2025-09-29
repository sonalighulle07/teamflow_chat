const pool = require("../Utils/db");

class User {
  // ===== Create User =====
  static async create({ full_name, email, contact, username, password }) {
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, contact, username, password) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, contact, username, password]
    );
    return result.insertId;
  }

  // ===== Find by Username =====
  static async findByUsername(username) {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return rows[0];
  }

  // ===== Find by Email =====
  static async findByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0];
  }

  // ===== Find by ID =====
  static async findById(id) {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, contact, username, profile_image FROM users WHERE id = ?",
      [id]
    );
    return rows[0];
  }

  // ===== Get all users =====
  static async getAll() {
    const [rows] = await pool.query(
      "SELECT id, full_name, username, profile_image, is_online FROM users"
    );
    return rows;
  }

  // ===== Update Avatar =====
  static async updateAvatar(userId, filePath) {
    await pool.query("UPDATE users SET profile_image = ? WHERE id = ?", [
      filePath,
      userId,
    ]);
    return this.findById(userId);
  }

  // ===== Set Online Status =====
  static async setOnlineStatus(userId, status = true) {
    await pool.query("UPDATE users SET is_online = ? WHERE id = ?", [
      status ? 1 : 0,
      userId,
    ]);
  }

  // ===== Save Push Subscription =====
  static async savePushSubscription(userId, subscription) {
    const subJson = JSON.stringify(subscription);
    await pool.query("UPDATE users SET push_subscription = ? WHERE id = ?", [
      subJson,
      userId,
    ]);
  }

  // ===== Get Push Subscription =====
  static async getPushSubscription(userId) {
    const [rows] = await pool.query(
      "SELECT push_subscription FROM users WHERE id = ?",
      [userId]
    );
    console.log("subscription :"+ JSON.stringify(rows[0]));
    return rows[0]?.push_subscription
      ? JSON.parse(rows[0].push_subscription)
      : null;
  }
}

module.exports = User;
