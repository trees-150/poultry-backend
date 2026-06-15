const db = require('../config/db');

async function run() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const tables = ['flock','feed_inventory','feed_log','mortality','sales','expenses','vaccination','treatment'];
    for (const t of tables) {
      console.log(`Altering table ${t}...`);
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL`);
    }
    await client.query('COMMIT');
    console.log('Soft-delete columns added (or already exist).');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error adding soft-delete columns:', err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

if (require.main === module) run();

module.exports = run;
