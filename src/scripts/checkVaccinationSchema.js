require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const res = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'vaccination'
       ORDER BY ordinal_position`
    );
    console.log('vaccination columns:', res.rows);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('checkVaccinationSchema failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
