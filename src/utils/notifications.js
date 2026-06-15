const db = require('../config/db');

// Ensure notifications table exists
async function ensureNotificationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      farm_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_read BOOLEAN DEFAULT FALSE
    );
  `;
  try {
    await db.query(sql);
  } catch (err) {
    console.error('Error ensuring notifications table exists:', err);
  }
}

// Create a notification. Accepts an object with { farm_id, title, message, type }
async function createNotification({ farm_id, title, message, type }) {
  try {
    const res = await db.query(
      `INSERT INTO notifications (farm_id, title, message, type) VALUES ($1,$2,$3,$4) RETURNING *`,
      [farm_id, title, message, type]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
}

// Module init
ensureNotificationsTable();

module.exports = {
  createNotification,
  ensureNotificationsTable,
};
