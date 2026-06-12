const db = require('../config/db');

async function run() {
  try {
    console.log('Creating farms table if not exists...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS farms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        invite_code TEXT NOT NULL UNIQUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Done creating farms table.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating farms table:', err);
    process.exit(1);
  }
}

run();
