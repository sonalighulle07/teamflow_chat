const pool = require('../utils/db');

class User {
    static async create(username, hashedPassword) {
        const [result] = await pool.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        return result.insertId;
    }

    static async findByUsername(username) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, username, profile_image FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async getAll() {
        const [rows] = await pool.query('SELECT id, username, profile_image FROM users');
        return rows;
    }

    static async updateAvatar(userId, filePath) {
        await pool.query('UPDATE users SET profile_image=? WHERE id=?', [filePath, userId]);
        return this.findById(userId);
    }
}

module.exports = User;
