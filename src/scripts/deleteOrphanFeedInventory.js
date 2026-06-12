require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const idToDelete = 2;
    console.log(`Deleting feed_inventory row id=${idToDelete} (orphan)`);
    const res = await db.query('DELETE FROM feed_inventory WHERE id = $1 RETURNING *', [idToDelete]);
    if (res.rowCount === 0) {
      console.log('No row deleted (not found).');
    } else {
      console.log('Deleted row:', res.rows[0]);
    }

    const rem = await db.query('SELECT COUNT(*) AS cnt FROM feed_inventory WHERE farm_id IS NULL');
    console.log('Remaining NULL farm_id rows:', rem.rows[0].cnt);

    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error deleting orphan feed_inventory:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
