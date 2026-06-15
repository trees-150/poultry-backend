const db = require('../config/db');
const notifications = require('../utils/notifications');

// Helper to get user's farm_id
async function getUserFarmId(user_id) {
  const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
  if (u.rowCount === 0) return null;
  return u.rows[0].farm_id;
}

// Add feed usage (uses a DB transaction)
const createFeedLog = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const { flock_id, feed_inventory_id, quantity_used, date_used, notes } = req.body;

    await client.query('BEGIN');

    // Validate flock belongs to farm
    const flockRes = await client.query('SELECT farm_id FROM flock WHERE id = $1', [flock_id]);
    if (flockRes.rowCount === 0 || flockRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Flock not found or does not belong to your farm' });
    }

    // Validate inventory belongs to farm
    const invRes = await client.query('SELECT farm_id, quantity_kg FROM feed_inventory WHERE id = $1', [feed_inventory_id]);
    if (invRes.rowCount === 0 || invRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Feed inventory not found or does not belong to your farm' });
    }

    // 1. Insert feed log with farm_id
    const logResult = await client.query(
      `INSERT INTO feed_log 
      (farm_id, user_id, flock_id, feed_inventory_id, quantity_used, date_used, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [farm_id, user_id, flock_id, feed_inventory_id, quantity_used, date_used, notes]
    );

    // 2. Deduct from inventory (ensure inventory belongs to farm)
    await client.query(
      `UPDATE feed_inventory
       SET quantity_kg = quantity_kg - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND farm_id = $3`,
      [quantity_used, feed_inventory_id, farm_id]
    );

    await client.query('COMMIT');

    // After committing, check remaining inventory and create notification if below threshold
    try {
      const invCheck = await db.query('SELECT quantity_kg, feed_name FROM feed_inventory WHERE id = $1 AND farm_id = $2', [feed_inventory_id, farm_id]);
      if (invCheck.rowCount > 0) {
        const qtyLeft = Number(invCheck.rows[0].quantity_kg || 0);
        const feedName = invCheck.rows[0].feed_name || 'Feed';
        const lowThreshold = process.env.LOW_FEED_THRESHOLD_KG ? Number(process.env.LOW_FEED_THRESHOLD_KG) : 10;
        if (!isNaN(lowThreshold) && qtyLeft <= lowThreshold) {
          await notifications.createNotification({
            farm_id: farm_id,
            title: 'Low Feed Stock',
            message: `${feedName} is low: ${qtyLeft} kg remaining.`,
            type: 'low_feed'
          });
        }
      }
    } catch (nerr) {
      console.error('Error creating low feed notification:', nerr);
    }

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
      WHERE fl.id = $1 AND fl.farm_id = $2
    `, [logResult.rows[0].id, farm_id]);

    res.json(fullLogResult.rows[0]);

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Feed log error:', err);
    res.status(500).json({ message: 'Error creating feed log', error: err.message });
  } finally {
    client.release();
  }
};

// Update feed usage (scoped to farm)
const updateFeedLog = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { flock_id, feed_inventory_id, quantity_used, date_used, notes } = req.body;

    await client.query('BEGIN');

    // Get old log to adjust inventory (scoped by farm)
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const oldLogRes = await client.query('SELECT * FROM feed_log WHERE id = $1 AND farm_id = $2', [id, farm_id]);
    if (oldLogRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Feed log not found' });
    }
    const oldLog = oldLogRes.rows[0];

    // Restore old quantity to old inventory (ensure same farm)
    await client.query('UPDATE feed_inventory SET quantity_kg = quantity_kg + $1 WHERE id = $2 AND farm_id = $3', [oldLog.quantity_used, oldLog.feed_inventory_id, farm_id]);

    // Validate new flock and inventory belong to the same farm
    const newFlockRes = await client.query('SELECT farm_id FROM flock WHERE id = $1', [flock_id]);
    if (newFlockRes.rowCount === 0 || newFlockRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'New flock not found or does not belong to your farm' });
    }
    const newInvRes = await client.query('SELECT farm_id FROM feed_inventory WHERE id = $1', [feed_inventory_id]);
    if (newInvRes.rowCount === 0 || newInvRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'New feed inventory not found or does not belong to your farm' });
    }

    // Update log
    const updateResult = await client.query('UPDATE feed_log SET flock_id = $1, feed_inventory_id = $2, quantity_used = $3, date_used = $4, notes = $5 WHERE id = $6 AND farm_id = $7 RETURNING *', [flock_id, feed_inventory_id, quantity_used, date_used, notes, id, farm_id]);

    // Deduct new quantity from new inventory
    await client.query('UPDATE feed_inventory SET quantity_kg = quantity_kg - $1 WHERE id = $2 AND farm_id = $3', [quantity_used, feed_inventory_id, farm_id]);

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update feed log error:', err);
    res.status(500).json({ message: 'Error updating feed log', error: err.message });
  } finally {
    client.release();
  }
};

// Delete feed usage
const deleteFeedLog = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const logRes = await client.query('SELECT * FROM feed_log WHERE id = $1 AND farm_id = $2', [id, farm_id]);
    if (logRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Feed log not found' });
    }
    const log = logRes.rows[0];

    // Restore inventory
    await client.query('UPDATE feed_inventory SET quantity_kg = quantity_kg + $1 WHERE id = $2 AND farm_id = $3', [log.quantity_used, log.feed_inventory_id, farm_id]);

    await client.query('DELETE FROM feed_log WHERE id = $1 AND farm_id = $2', [id, farm_id]);

    await client.query('COMMIT');
    res.json({ message: 'Feed log deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete feed log error:', err);
    res.status(500).json({ message: 'Error deleting feed log', error: err.message });
  } finally {
    client.release();
  }
};

// Get all feed logs (scoped to farm)
const getFeedLogs = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });
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
      WHERE fl.farm_id = $1
      ORDER BY fl.id DESC
    `, [farm_id]);

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
