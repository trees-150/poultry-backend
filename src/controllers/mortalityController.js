const db = require('../config/db');

// Create mortality record using a transaction
const createMortality = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      flock_id,
      date_recorded,
      quantity,
      cause,
      notes
    } = req.body;

    if (!flock_id || quantity === undefined) {
      return res.status(400).json({ message: 'flock_id and quantity are required' });
    }

    await client.query('BEGIN');

    // Check flock exists and get current quantity
    const flockResult = await client.query(
      'SELECT quantity FROM flock WHERE id = $1',
      [flock_id]
    );

    if (flockResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Flock not found' });
    }

    const currentQuantity = Number(flockResult.rows[0].quantity || 0);
    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }

    if (qty > currentQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Mortality exceeds current flock size' });
    }

    // Insert mortality record
    const insertResult = await client.query(
      `INSERT INTO mortality
      (flock_id, date_recorded, quantity, cause, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [flock_id, date_recorded, qty, cause, notes]
    );

    // Reduce flock quantity
    await client.query(
      `UPDATE flock
       SET quantity = quantity - $1
       WHERE id = $2`,
      [qty, flock_id]
    );

    await client.query('COMMIT');

    res.json(insertResult.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr);
    }
    console.error('Error creating mortality record:', err);
    res.status(500).json({ message: 'Server error creating mortality record' });
  } finally {
    client.release();
  }
};

// Get all mortality records
const getMortality = async (req, res) => {
  try {
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
      ORDER BY m.id DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching mortality records:', err);

    res.status(500).json({
      message: 'Server error fetching mortality records'
    });
  }
};

module.exports = {
  createMortality,
  getMortality
};
