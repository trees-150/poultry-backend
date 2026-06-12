require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const payload = {
      flock_id: 1,
      disease: 'Coccidiosis',
      medication: 'Toltrazuril',
      cost: 25.5,
      date_given: '2026-06-12',
      notes: 'test treatment'
    };

    const result = await db.query(
      `INSERT INTO treatment (flock_id, disease, medication, cost, date_given, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [payload.flock_id, payload.disease, payload.medication, payload.cost, payload.date_given, payload.notes]
    );

    console.log('Inserted treatment:', result.rows[0]);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('insertTreatmentTest failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
