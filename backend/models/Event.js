
const moment = require('moment');
const db = require("../config/db"); 

class Event {
  static async getAll() {
    const [rows] = await db.execute("SELECT * FROM calendar_events ORDER BY start ASC");
    return rows;
  }

  static async create({ title, start, end }) {
    const startDate = moment(start).format("YYYY-MM-DD HH:mm:ss");
    const endDate = moment(end).format("YYYY-MM-DD HH:mm:ss");

    const [result] = await db.execute(
      "INSERT INTO calendar_events (title, start, end) VALUES (?, ?, ?)",
      [title, startDate, endDate]
    );

    return { id: result.insertId, title, start: startDate, end: endDate };
  }

  static async update(id, { title, start, end }) {
    const startDate = moment(start).format("YYYY-MM-DD HH:mm:ss");
    const endDate = moment(end).format("YYYY-MM-DD HH:mm:ss");

    await db.execute(
      "UPDATE calendar_events SET title=?, start=?, end=? WHERE id=?",
      [title, startDate, endDate, id]
    );

    return { id, title, start: startDate, end: endDate };
  }

  static async delete(id) {
    await db.execute("DELETE FROM calendar_events WHERE id=?", [id]);
    return true;
  }
}

module.exports = Event;
