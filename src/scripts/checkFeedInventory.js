require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const res = await db.query("SELECT to_regclass('public.feed_inventory') AS reg");
    console.log('to_regclass:', res.rows[0]);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('checkFeedInventory failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
