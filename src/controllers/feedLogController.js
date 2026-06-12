const db = require('../config/db');

// Add feed usage (uses a DB transaction)
const createFeedLog = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const user_id = req.user && req.user.id;
    await client.query("BEGIN");

    const { flock_id, feed_inventory_id, quantity_used, date_used, notes } = req.body;

    // 1. Insert feed log with user_id
    const logResult = await client.query(
      `INSERT INTO feed_log 
      (user_id, flock_id, feed_inventory_id, quantity_used, date_used, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [user_id, flock_id, feed_inventory_id, quantity_used, date_used, notes]
    );

    // 2. Deduct from inventory (ensure inventory belongs to user)
    await client.query(
      `UPDATE feed_inventory
       SET quantity_kg = quantity_kg - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3`,
      [quantity_used, feed_inventory_id, user_id]
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
      WHERE fl.id = $1 AND fl.user_id = $2
    `, [logResult.rows[0].id, user_id]);

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

// Update feed usage
const updateFeedLog = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { flock_id, feed_inventory_id, quantity_used, date_used, notes } = req.body;

    await client.query("BEGIN");

    // Get old log to adjust inventory
    const user_id = req.user && req.user.id;
    const oldLogRes = await client.query("SELECT * FROM feed_log WHERE id = $1 AND user_id = $2", [id, user_id]);
    if (oldLogRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Feed log not found" });
    }
    const oldLog = oldLogRes.rows[0];

    // Restore old quantity to old inventory
    await client.query(
      "UPDATE feed_inventory SET quantity_kg = quantity_kg + $1 WHERE id = $2 AND user_id = $3",
      [oldLog.quantity_used, oldLog.feed_inventory_id, user_id]
    );

    // Update log
    const updateResult = await client.query(
      `UPDATE feed_log
       SET flock_id = $1, feed_inventory_id = $2, quantity_used = $3, date_used = $4, notes = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [flock_id, feed_inventory_id, quantity_used, date_used, notes, id, user_id]
    );

    // Deduct new quantity from new inventory
    await client.query(
      "UPDATE feed_inventory SET quantity_kg = quantity_kg - $1 WHERE id = $2 AND user_id = $3",
      [quantity_used, feed_inventory_id, user_id]
    );

    await client.query("COMMIT");
    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update feed log error:", err);
    res.status(500).json({ message: "Error updating feed log", error: err.message });
  } finally {
    client.release();
  }
};

// Delete feed usage
const deleteFeedLog = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    const user_id = req.user && req.user.id;
    const logRes = await client.query("SELECT * FROM feed_log WHERE id = $1 AND user_id = $2", [id, user_id]);
    if (logRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Feed log not found" });
    }
    const log = logRes.rows[0];

    // Restore inventory
    await client.query(
      "UPDATE feed_inventory SET quantity_kg = quantity_kg + $1 WHERE id = $2 AND user_id = $3",
      [log.quantity_used, log.feed_inventory_id, user_id]
    );

    await client.query("DELETE FROM feed_log WHERE id = $1 AND user_id = $2", [id, user_id]);

    await client.query("COMMIT");
    res.json({ message: "Feed log deleted" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete feed log error:", err);
    res.status(500).json({ message: "Error deleting feed log", error: err.message });
  } finally {
    client.release();
  }
};

// Get all feed logs
const getFeedLogs = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
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
      WHERE fl.user_id = $1
      ORDER BY fl.id DESC
    `, [user_id]);

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
  updateFeedLog,
  deleteFeedLog,
  getFeedLogs
};
