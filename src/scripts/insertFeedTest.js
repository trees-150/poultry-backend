require('dotenv').config();
const db = require('../config/db');

async function run() {
  try {
    const payload = {
      feed_name: 'TestFeed',
      feed_type: 'Mash',
      quantity_kg: 50,
      unit_cost: 10.5,
      supplier: 'UnitTest'
    };

    const result = await db.query(
      `INSERT INTO feed_inventory (feed_name, feed_type, quantity_kg, unit_cost, supplier)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [payload.feed_name, payload.feed_type, payload.quantity_kg, payload.unit_cost, payload.supplier]
    );

    console.log('Inserted:', result.rows[0]);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('insertFeedTest failed:', err);
    try { await db.pool.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
