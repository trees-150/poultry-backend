require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const payload = {
      flock_id: 1,
      vaccine_name: 'TestVac',
      dosage: '1ml',
      date_given: '2026-06-12',
      notes: 'integration test'
    };

    const result = await db.query(
      `INSERT INTO vaccination (flock_id, vaccine_name, dosage, date_given, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [payload.flock_id, payload.vaccine_name, payload.dosage, payload.date_given, payload.notes]
    );

    console.log('Inserted vaccination:', result.rows[0]);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('insertVaccinationTest failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
