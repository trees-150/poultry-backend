require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    console.log('Backfilling feed_inventory.farm_id from users.farm_id...');

    const countRes = await db.query("SELECT COUNT(*) AS cnt FROM feed_inventory WHERE farm_id IS NULL");
    const cnt = parseInt(countRes.rows[0].cnt, 10);
    console.log(`Found ${cnt} rows with NULL farm_id`);

    if (cnt === 0) {
      await db.pool.end();
      console.log('Nothing to backfill.');
      process.exit(0);
    }

    const res = await db.query(`
      UPDATE feed_inventory fi
      SET farm_id = u.farm_id
      FROM users u
      WHERE fi.user_id = u.id AND fi.farm_id IS NULL
      RETURNING fi.id, fi.user_id, fi.feed_name, fi.farm_id
    `);

    console.log(`Updated ${res.rowCount} rows.`);
    if (res.rowCount > 0) {
      console.log('Sample updated rows:', res.rows.slice(0, 10));
    }

    const rem = await db.query("SELECT COUNT(*) AS cnt FROM feed_inventory WHERE farm_id IS NULL");
    console.log('Remaining NULL farm_id rows:', rem.rows[0].cnt);

    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
