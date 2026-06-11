// Quick DB connectivity test. Run with DATABASE_URL set in env.
require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const res = await db.query('SELECT 1 AS ok');
    console.log('DB test success:', res.rows);
    // close pool
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('DB test failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
