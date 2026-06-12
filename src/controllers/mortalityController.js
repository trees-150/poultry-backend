const db = require('../config/db');

// Helper to get user's farm_id
async function getUserFarmId(user_id) {
  const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
  if (u.rowCount === 0) return null;
  return u.rows[0].farm_id;
}

// Create mortality record using a transaction (farm-scoped)
const createMortality = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { flock_id, date_recorded, quantity, cause, notes } = req.body;

    if (!flock_id || quantity === undefined) {
      return res.status(400).json({ message: 'flock_id and quantity are required' });
    }

    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    await client.query('BEGIN');

    // Check flock exists, belongs to farm, and get current quantity (lock row)
    const flockResult = await client.query('SELECT quantity, farm_id FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (flockResult.rowCount === 0 || flockResult.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      console.error(`Mortality error: flock not found or not in farm (flock_id=${flock_id})`);
      return res.status(404).json({ message: 'Flock not found or does not belong to your farm' });
    }

    const currentQuantity = Number(flockResult.rows[0].quantity || 0);
    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      await client.query('ROLLBACK');
      console.error(`Mortality validation failed: invalid quantity (flock_id=${flock_id} quantity=${quantity})`);
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }

    if (qty > currentQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Mortality exceeds current flock size' });
    }

    // Insert mortality record with farm_id
    const insertResult = await client.query(
      `INSERT INTO mortality
      (farm_id, user_id, flock_id, date_recorded, quantity, cause, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [farm_id, user_id, flock_id, date_recorded, qty, cause, notes]
    );

    // Reduce flock quantity (ensure same farm)
    await client.query('UPDATE flock SET quantity = quantity - $1 WHERE id = $2 AND farm_id = $3', [qty, flock_id, farm_id]);

    await client.query('COMMIT');
    res.json(insertResult.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error(`Error creating mortality record:`, err);
    res.status(500).json({ message: 'Server error creating mortality record', error: err.message });
  } finally {
    client.release();
  }
};

const updateMortality = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { flock_id, date_recorded, quantity, cause, notes } = req.body;

    await client.query('BEGIN');

    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    // Lock and fetch old mortality record scoped by farm
    const oldRes = await client.query('SELECT * FROM mortality WHERE id = $1 AND farm_id = $2 FOR UPDATE', [id, farm_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Mortality record not found' });
    }
    const oldRec = oldRes.rows[0];

    // Restore old quantity to old flock (lock flock row)
    const oldFlockRes = await client.query('SELECT quantity, farm_id FROM flock WHERE id = $1 FOR UPDATE', [oldRec.flock_id]);
    if (oldFlockRes.rowCount === 0 || oldFlockRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Associated flock not found or does not belong to your farm' });
    }
    await client.query('UPDATE flock SET quantity = quantity + $1 WHERE id = $2 AND farm_id = $3', [oldRec.quantity, oldRec.flock_id, farm_id]);

    // Validate new flock (belongs to same farm) and quantities
    const newFlockRes = await client.query('SELECT quantity, farm_id FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (newFlockRes.rowCount === 0 || newFlockRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'New flock not found or does not belong to your farm' });
    }
    const currentQty = Number(newFlockRes.rows[0].quantity || 0);
    const newQty = Number(quantity);
    if (isNaN(newQty) || newQty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }
    if (newQty > currentQty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Mortality exceeds current flock size' });
    }

    // Update mortality record (scoped by farm)
    const updateResult = await client.query(
      `UPDATE mortality
       SET flock_id = $1, date_recorded = $2, quantity = $3, cause = $4, notes = $5
       WHERE id = $6 AND farm_id = $7
       RETURNING *`,
      [flock_id, date_recorded, newQty, cause, notes, id, farm_id]
    );

    // Deduct new quantity from new flock
    await client.query('UPDATE flock SET quantity = quantity - $1 WHERE id = $2 AND farm_id = $3', [newQty, flock_id, farm_id]);

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error updating mortality record:', err);
    res.status(500).json({ message: 'Server error updating mortality record' });
  } finally {
    client.release();
  }
};

const deleteMortality = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const resOld = await client.query('SELECT * FROM mortality WHERE id = $1 AND farm_id = $2 FOR UPDATE', [id, farm_id]);
    if (resOld.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Mortality record not found' });
    }
    const oldRec = resOld.rows[0];

    // Restore flock quantity (ensure same farm)
    await client.query('UPDATE flock SET quantity = quantity + $1 WHERE id = $2 AND farm_id = $3', [oldRec.quantity, oldRec.flock_id, farm_id]);

    await client.query('DELETE FROM mortality WHERE id = $1 AND farm_id = $2', [id, farm_id]);

    await client.query('COMMIT');
    res.json({ message: 'Mortality record deleted' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error deleting mortality record:', err);
    res.status(500).json({ message: 'Server error deleting mortality record' });
  } finally {
    client.release();
  }
};

// Get all mortality records
const getMortality = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const result = await db.query(`
      SELECT
        m.id,
        m.flock_id,
        f.name AS flock_name,
        m.date_recorded AS date_recorded,
        m.quantity,
        m.cause,
        m.notes,
        m.created_at
      FROM mortality m
      JOIN flock f
        ON m.flock_id = f.id
      WHERE m.user_id = $1
      ORDER BY m.id DESC
    `, [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching mortality records:', err);
    res.status(500).json({ message: 'Server error fetching mortality records' });
  }
};

module.exports = {
  createMortality,
  getMortality,
  updateMortality,
  deleteMortality
};
