const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const MIGRATION = path.join(__dirname, '..', 'migrations', 'normalize_emails.sql');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in environment. Aborting.');
    process.exit(2);
  }

  const sql = fs.readFileSync(MIGRATION, 'utf8');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  const client = await pool.connect();
  try {
    console.log('Applying migration:', MIGRATION);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
    process.exit(0);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Unexpected error running migration:', err);
  process.exit(3);
});
