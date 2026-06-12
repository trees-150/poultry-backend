require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const res = await db.query(`SELECT id, user_id, feed_name, quantity_kg, supplier FROM feed_inventory WHERE farm_id IS NULL`);
    console.log('Orphan feed_inventory rows:', res.rows);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error listing orphan feed_inventory:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
