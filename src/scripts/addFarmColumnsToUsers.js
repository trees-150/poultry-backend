const db = require('../config/db');

async function run() {
  try {
    console.log('Altering users table to add farm_id and role columns...');

    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS farm_id INTEGER`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'`);

    console.log('Done. Note: role values are not constrained by DB; application enforces allowed roles.');
    process.exit(0);
  } catch (err) {
    console.error('Error altering users table:', err);
    process.exit(1);
  }
}

run();
