const pool = require("../config/db");
const fs = require("fs").promises;

class User {
  // ===== Create User =====
  static async create({ full_name, email, contact, username, password }) {
    try {
      const [result] = await pool.query(
        `INSERT INTO users (full_name, email, contact, username, password)
         VALUES (?, ?, ?, ?, ?)`,
        [full_name, email, contact, username, password]
      );
      return result.insertId;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // ===== Find by Username =====
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE username = ? LIMIT 1",
        [username]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error finding user by username:", error);
      throw error;
    }
  }

  // ===== Find by Email =====
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  // ===== Find by ID =====
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT id, full_name, email, contact, username, profile_image, is_online
         FROM users WHERE id = ? LIMIT 1`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  // ===== Get all users =====
  static async getAll() {
    try {
      const [rows] = await pool.query(
        `SELECT id, full_name, username, profile_image, is_online
         FROM users ORDER BY username ASC`
      );
      return rows;
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  }

  // ===== Update Avatar =====
  static async updateAvatar(userId, filePath) {
    try {
      await pool.query("UPDATE users SET profile_image = ? WHERE id = ?", [
        filePath,
        userId,
      ]);
      return await this.findById(userId);
    } catch (error) {
      console.error("Error updating avatar:", error);
      throw error;
    }
  }

  // ===== Set Online Status =====
  static async setOnlineStatus(userId, status = true) {
    try {
      await pool.query("UPDATE users SET is_online = ? WHERE id = ?", [
        status ? 1 : 0,
        userId,
      ]);
    } catch (error) {
      console.error("Error setting online status:", error);
      throw error;
    }
  }

  // ===== Save Push Subscription =====
  static async savePushSubscription(userId, subscription) {
    try {
      const subJson = JSON.stringify(subscription);
      await pool.query("UPDATE users SET push_subscription = ? WHERE id = ?", [
        subJson,
        userId,
      ]);
    } catch (error) {
      console.error("Error saving push subscription:", error);
      throw error;
    }
  }

  // ===== Get Push Subscription =====
  static async getPushSubscription(userId) {
    try {
      const [rows] = await pool.query(
        "SELECT push_subscription FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      return rows[0]?.push_subscription
        ? JSON.parse(rows[0].push_subscription)
        : null;
    } catch (error) {
      console.error("Error fetching push subscription:", error);
      throw error;
    }
  }

  // ===== Soft Delete User =====
  static async softDeleteById(userId) {
    try {
      const [result] = await pool.query(
        "UPDATE users SET is_deleted = 1 WHERE id = ?",
        [userId]
      );
      return result;
    } catch (error) {
      console.error("Error soft deleting user:", error);
      throw error;
    }
  }

  // ===== Delete all chats by user =====
  static async deleteChatsByUserId(userId) {
    try {
      await pool.query(
        "DELETE FROM chats WHERE sender_id = ? OR receiver_id = ?",
        [userId, userId]
      );
      await pool.query("DELETE FROM team_messages WHERE sender_id = ?", [
        userId,
      ]);
      return true;
    } catch (error) {
      console.error("Error deleting user chats:", error);
      throw error;
    }
  }

 static async deleteById(userId) {
  if (!userId) throw new Error("User ID is required for deletion");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    console.log("Deleting user with ID:", userId);

    const [userRows] = await conn.query(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );
    const user = userRows[0];
    if (!user) {
      console.warn("User not found:", userId);
      await conn.release();
      return false;
    }

    // Delete avatar
    if (user.profile_image) {
      const filePath = `./public${user.profile_image}`;
      try {
        await fs.unlink(filePath);
        console.log("Avatar deleted:", filePath);
      } catch (err) {
        console.warn("Avatar deletion failed (may not exist):", err.message);
      }
    }

    // Delete chats
    await conn.query(
      "DELETE FROM chats WHERE sender_id = ? OR receiver_id = ?",
      [userId, userId]
    );

    // Delete user
    const [result] = await conn.query("DELETE FROM users WHERE id = ?", [
      userId,
    ]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return false;
    }

    await conn.commit();
    console.log("User deleted successfully:", userId);
    return true;
  } catch (err) {
    await conn.rollback();
    console.error("Error deleting user:", err.message);
    return false;
  } finally {
    await conn.release();
  }
}

}

module.exports = User;
