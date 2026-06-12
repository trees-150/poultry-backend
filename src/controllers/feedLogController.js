const db = require('../config/db');

// Add feed usage (uses a DB transaction)
const createFeedLog = async (req, res) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const { flock_id, feed_inventory_id, quantity_used, date_used, notes } = req.body;

    // 1. Insert feed log
    const logResult = await client.query(
      `INSERT INTO feed_log 
      (flock_id, feed_inventory_id, quantity_used, date_used, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [flock_id, feed_inventory_id, quantity_used, date_used, notes]
    );

    // 2. Deduct from inventory
    await client.query(
      `UPDATE feed_inventory
       SET quantity_kg = quantity_kg - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [quantity_used, feed_inventory_id]
    );

    await client.query("COMMIT");

    // Fetch the complete log with names to return to the app
    const fullLogResult = await client.query(`
      SELECT
        fl.id,
        fl.flock_id,
        fl.feed_inventory_id,
        f.name AS flock_name,
        fi.feed_name AS feed_name,
        fi.feed_type,
        fl.quantity_used,
        fl.date_used,
        fl.notes,
        fl.created_at
      FROM feed_log fl
      JOIN flock f ON fl.flock_id = f.id
      JOIN feed_inventory fi ON fl.feed_inventory_id = fi.id
      WHERE fl.id = $1
    `, [logResult.rows[0].id]);

    res.json(fullLogResult.rows[0]);

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Feed log error:", err);

    res.status(500).json({
      message: "Error creating feed log",
      error: err.message
    });
  } finally {
    client.release();
  }
};

// Get all feed logs
const getFeedLogs = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        fl.id,
        fl.flock_id,
        fl.feed_inventory_id,
        f.name AS flock_name,
        fi.feed_name AS feed_name,
        fi.feed_type,
        fl.quantity_used,
        fl.date_used,
        fl.notes,
        fl.created_at
      FROM feed_log fl
      JOIN flock f
        ON fl.flock_id = f.id
      JOIN feed_inventory fi
        ON fl.feed_inventory_id = fi.id
      ORDER BY fl.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching feed logs:', err);
    res.status(500).json({
      message: 'Server error fetching feed logs'
    });
  }
};

module.exports = {
  createFeedLog,
  getFeedLogs
};
