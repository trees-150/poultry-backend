require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const payload = {
      flock_id: 1,
      date_recorded: '2026-06-11',
      quantity: 1,
      cause: 'test-cause',
      notes: 'insert test'
    };

    const result = await db.query(
      `INSERT INTO mortality (flock_id, date_recorded, quantity, cause, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [payload.flock_id, payload.date_recorded, payload.quantity, payload.cause, payload.notes]
    );

    console.log('Inserted mortality:', result.rows[0]);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('insertMortalityTest failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
