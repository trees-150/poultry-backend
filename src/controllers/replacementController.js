const db = require('../config/db');

// Create replacement record using a transaction
const createReplacement = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { flock_id, date, quantity, source, notes } = req.body;

    if (!flock_id || quantity === undefined) {
      return res.status(400).json({ message: 'flock_id and quantity are required' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }

    await client.query('BEGIN');

    // Verify flock exists and get current quantity
    const flockResult = await client.query('SELECT quantity FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (flockResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Flock not found' });
    }

    // Insert replacement record
    const insertResult = await client.query(
      `INSERT INTO replacement
      (flock_id, date, quantity, source, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [flock_id, date, qty, source, notes]
    );

    // Increase flock quantity
    await client.query(
      `UPDATE flock
       SET quantity = quantity + $1
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
    console.error('Error creating replacement record:', err);
    res.status(500).json({ message: 'Server error creating replacement record' });
  } finally {
    client.release();
  }
};

// Get all replacement records
const getReplacements = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        r.id,
        f.name AS flock_name,
        r.date,
        r.quantity,
        r.source,
        r.notes,
        r.created_at
      FROM replacement r
      JOIN flock f
        ON r.flock_id = f.id
      ORDER BY r.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching replacement records:', err);
    res.status(500).json({ message: 'Server error fetching replacement records' });
  }
};

module.exports = {
  createReplacement,
  getReplacements
};
