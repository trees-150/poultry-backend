const db = require('../config/db');

// Ensure farm_activities table exists
async function ensureActivitiesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS farm_activities (
      id SERIAL PRIMARY KEY,
      farm_id INTEGER NOT NULL,
      user_id INTEGER,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(sql);
  } catch (err) {
    console.error('Error ensuring farm_activities table exists:', err);
  }
}

async function createActivity({ farm_id, user_id, activity_type, title, description }) {
  try {
    const res = await db.query(
      `INSERT INTO farm_activities (farm_id, user_id, activity_type, title, description) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [farm_id, user_id || null, activity_type, title, description]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Error creating farm activity:', err);
    return null;
  }
}

ensureActivitiesTable();

module.exports = { ensureActivitiesTable, createActivity };
