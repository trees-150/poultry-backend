const db = require("../config/db");

// GET sales
const getSales = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, f.name AS flock_name
      FROM sales s
      JOIN flock f ON s.flock_id = f.id
      ORDER BY s.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sales:", err);
    res.status(500).json({
      message: "Server error fetching sales",
      error: err.message
    });
  }
};

// CREATE sale
const createSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      flock_id,
      quantity_sold,
      price_per_unit,
      buyer_name,
      date_sold,
      notes
    } = req.body;

    if (!flock_id || quantity_sold === undefined) {
      return res.status(400).json({ message: 'flock_id and quantity_sold are required' });
    }

    const qty = Number(quantity_sold);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'quantity_sold must be a positive number' });
    }

    await client.query('BEGIN');

    // Lock flock row
    const flockRes = await client.query('SELECT quantity FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (flockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      console.error(`Sale error: flock not found (flock_id=${flock_id})`);
      return res.status(404).json({ message: 'Flock not found' });
    }

    const currentQty = Number(flockRes.rows[0].quantity || 0);
    if (qty > currentQty) {
      await client.query('ROLLBACK');
      console.error(`Sale validation failed: insufficient flock quantity (flock_id=${flock_id} current=${currentQty} attempted=${qty})`);
      return res.status(400).json({ message: 'Quantity sold exceeds current flock size' });
    }

    const total_amount = qty * Number(price_per_unit || 0);

    const insertRes = await client.query(
      `INSERT INTO sales 
      (flock_id, quantity_sold, price_per_unit, total_amount, buyer_name, date_sold, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [flock_id, qty, price_per_unit, total_amount, buyer_name, date_sold, notes]
    );

    // Decrement flock quantity
    await client.query('UPDATE flock SET quantity = quantity - $1 WHERE id = $2', [qty, flock_id]);

    await client.query('COMMIT');

    const row = insertRes.rows[0];
    if (row) {
      row.price_per_unit = row.price_per_unit != null ? formatUGX(row.price_per_unit) : row.price_per_unit;
      row.total_amount = row.total_amount != null ? formatUGX(row.total_amount) : row.total_amount;
    }
    res.json(row);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Rollback error during createSale:', rbErr);
    }
    console.error(`Error creating sale (flock_id=${req.body?.flock_id} quantity_sold=${req.body?.quantity_sold}):`, err);
    res.status(500).json({ message: 'Server error creating sale', error: err.message });
  } finally {
    client.release();
  }
};

module.exports = { getSales, createSale };
