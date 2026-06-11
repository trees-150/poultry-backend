const db = require('../config/db');

// Add feed usage (uses a DB transaction)
const createFeedLog = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      flock_id,
      feed_inventory_id,
      quantity_used,
      date_used,
      notes
    } = req.body;

    if (feed_inventory_id === undefined || quantity_used === undefined) {
      return res.status(400).json({ message: 'feed_inventory_id and quantity_used are required' });
    }

    const useQty = Number(quantity_used);
    if (isNaN(useQty) || useQty <= 0) {
      return res.status(400).json({ message: 'quantity_used must be a positive number' });
    }

    await client.query('BEGIN');

    // Check current stock and lock the row to avoid races
    const stockResult = await client.query(
      'SELECT quantity FROM feed_inventory WHERE id = $1 FOR UPDATE',
      [feed_inventory_id]
    );

    if (stockResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'feed inventory not found' });
    }

    const currentStock = Number(stockResult.rows[0].quantity || 0);
    if (currentStock < useQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Not enough feed in stock' });
    }

    // Insert feed log
    const insertResult = await client.query(
      `INSERT INTO feed_log
      (flock_id, feed_inventory_id, quantity_used, date_used, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        flock_id,
        feed_inventory_id,
        useQty,
        date_used,
        notes
      ]
    );

    // Reduce inventory
    await client.query(
      `UPDATE feed_inventory
       SET quantity = quantity - $1
       WHERE id = $2`,
      [useQty, feed_inventory_id]
    );

    await client.query('COMMIT');

    res.json(insertResult.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    console.error('Error creating feed log:', err);
    res.status(500).json({ message: 'Server error creating feed log' });
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
        f.name AS flock_name,
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
