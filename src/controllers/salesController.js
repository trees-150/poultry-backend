const db = require("../config/db");

// GET sales (farm-scoped)
const getSales = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: "User must belong to a farm" });

    const result = await db.query(`
      SELECT s.*, f.name AS flock_name
      FROM sales s
      JOIN flock f ON s.flock_id = f.id
      WHERE s.farm_id = $1 AND COALESCE(s.is_deleted, false) = false
      ORDER BY s.id DESC
    `, [farm_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sales:", err);
    res.status(500).json({ message: "Server error fetching sales", error: err.message });
  }
};

// CREATE sale (farm-scoped, transactional)
const createSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: "User must belong to a farm" });

    const { flock_id, quantity_sold, price_per_unit, buyer_name, date_sold, notes } = req.body;
    const qty = Number(quantity_sold);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity_sold must be > 0" });

    await client.query('BEGIN');

    // Lock flock row and validate it belongs to the same farm
    const flockRes = await client.query('SELECT id, quantity, farm_id, name FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (flockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Flock not found" });
    }
    const flock = flockRes.rows[0];
    if (flock.farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "Flock does not belong to user's farm" });
    }
    if (flock.quantity < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Cannot sell more birds than available in flock" });
    }

    const total_amount = qty * Number(price_per_unit || 0);

    const insertRes = await client.query(
      `INSERT INTO sales
        (user_id, farm_id, flock_id, quantity_sold, price_per_unit, total_amount, buyer_name, date_sold, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [userId, farm_id, flock_id, qty, price_per_unit, total_amount, buyer_name, date_sold, notes]
    );

    await client.query('UPDATE flock SET quantity = quantity - $1 WHERE id = $2', [qty, flock_id]);

    await client.query('COMMIT');

    const row = insertRes.rows[0];
    row.flock_name = flock.name;

    // Create sale notification and activity (farm-wide)
    try {
      const notifications = require('../utils/notifications');
      const activity = require('../utils/activity');
      const msg = `Sale recorded: ${qty} unit(s) from ${flock.name} for ${total_amount}.`;
      await notifications.createNotification({ farm_id, title: 'Sale Recorded', message: msg, type: 'sale' });
      const uRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = uRes.rowCount > 0 ? uRes.rows[0].name : 'A user';
      await activity.createActivity({
        farm_id,
        user_id: userId,
        activity_type: 'SALE_RECORDED',
        title: 'Sale Recorded',
        description: `${userName} recorded sale of ${qty} birds from ${flock.name}.`
      });
    } catch (nerr) {
      console.error('Error creating sale notification/activity:', nerr);
    }

    res.json(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error("Error creating sale:", err);
    res.status(500).json({ message: "Server error creating sale", error: err.message });
  } finally {
    client.release();
  }
};

const updateSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: "User must belong to a farm" });

    const { id } = req.params;
    const { flock_id, quantity_sold, price_per_unit, buyer_name, date_sold, notes } = req.body;
    const qty = Number(quantity_sold);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity_sold must be > 0" });

    await client.query('BEGIN');

    // Lock existing sale and ensure it's in the same farm
    const oldRes = await client.query('SELECT * FROM sales WHERE id = $1 AND farm_id = $2 FOR UPDATE', [id, farm_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Sale not found" });
    }
    const oldRec = oldRes.rows[0];

    // If flock changed, lock both flocks deterministically to avoid deadlocks
    const lockFlockIds = oldRec.flock_id === flock_id ? [flock_id] : [Math.min(oldRec.flock_id, flock_id), Math.max(oldRec.flock_id, flock_id)];
    for (const fid of lockFlockIds) {
      await client.query('SELECT id FROM flock WHERE id = $1 FOR UPDATE', [fid]);
    }

    // Restore old flock quantity
    await client.query('UPDATE flock SET quantity = quantity + $1 WHERE id = $2 AND farm_id = $3', [oldRec.quantity_sold, oldRec.flock_id, farm_id]);

    // Validate new flock belongs to farm and has enough quantity
    const newFlockRes = await client.query('SELECT id, quantity, name, farm_id FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (newFlockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "New flock not found" });
    }
    const newFlock = newFlockRes.rows[0];
    if (newFlock.farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "New flock does not belong to user's farm" });
    }
    if (newFlock.quantity < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Cannot sell more birds than available in flock" });
    }

    const total_amount = qty * Number(price_per_unit || 0);

    const result = await client.query(
      `UPDATE sales
       SET flock_id = $1, quantity_sold = $2, price_per_unit = $3, total_amount = $4, buyer_name = $5, date_sold = $6, notes = $7
       WHERE id = $8
       RETURNING *`,
      [flock_id, qty, price_per_unit, total_amount, buyer_name, date_sold, notes, id]
    );

    // Decrement new flock quantity
    await client.query('UPDATE flock SET quantity = quantity - $1 WHERE id = $2', [qty, flock_id]);

    await client.query('COMMIT');
    const row = result.rows[0];
    row.flock_name = newFlock.name;
    res.json(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error updating sale:', err);
    res.status(500).json({ message: 'Server error updating sale', error: err.message });
  } finally {
    client.release();
  }
};

const deleteSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    await client.query('BEGIN');

    const oldRes = await client.query('SELECT * FROM sales WHERE id = $1 AND farm_id = $2 FOR UPDATE', [id, farm_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sale not found' });
    }
    const oldRec = oldRes.rows[0];

    // Lock flock and restore quantity
    await client.query('SELECT id FROM flock WHERE id = $1 AND farm_id = $2 FOR UPDATE', [oldRec.flock_id, farm_id]);
    await client.query('UPDATE flock SET quantity = quantity + $1 WHERE id = $2 AND farm_id = $3', [oldRec.quantity_sold, oldRec.flock_id, farm_id]);

    await client.query('UPDATE sales SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND farm_id = $2', [id, farm_id]);

    await client.query('COMMIT');
    res.json({ message: 'Sale deleted' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error deleting sale:', err);
    res.status(500).json({ message: 'Server error deleting sale', error: err.message });
  } finally {
    client.release();
  }
};

const restoreSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    await client.query('BEGIN');

    const oldRes = await client.query('SELECT * FROM sales WHERE id = $1 AND farm_id = $2 FOR UPDATE', [id, farm_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sale not found' });
    }
    const oldRec = oldRes.rows[0];

    // Restore flock quantity reduction when sale was originally created -- ensure flock exists
    await client.query('UPDATE flock SET quantity = quantity - $1 WHERE id = $2 AND farm_id = $3', [oldRec.quantity_sold, oldRec.flock_id, farm_id]);

    const resu = await client.query('UPDATE sales SET is_deleted = false, deleted_at = NULL WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    await client.query('COMMIT');
    res.json({ message: 'Sale restored', data: resu.rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error restoring sale:', err);
    res.status(500).json({ message: 'Server error restoring sale', error: err.message });
  } finally {
    client.release();
  }
}

module.exports = { getSales, createSale, updateSale, deleteSale, restoreSale };
