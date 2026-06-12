const db = require('../config/db');

async function run() {
  try {
    console.log('Creating users table (if not exists) and adding user_id columns...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const tables = [
      'flock',
      'feed_inventory',
      'feed_log',
      'sales',
      'expenses',
      'mortality',
      'vaccination',
      'treatment'
    ];

    for (const t of tables) {
      try {
        await db.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS user_id INTEGER`);
      } catch (e) {
        console.warn(`Could not alter table ${t}:`, e.message);
      }
    }

    console.log('Done. You may want to add foreign keys or backfill user_id values.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating users or altering tables:', err);
    process.exit(1);
  }
}

run();
