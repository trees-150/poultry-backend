const db = require('../config/db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('password_resets table ensured');
    process.exit(0);
  } catch (err) {
    console.error('Error creating password_resets table', err);
    process.exit(1);
  }
}

run();
