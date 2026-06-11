const db = require('../config/db');

// CREATE sale
const createSale = async (req, res) => {
  try {
    const {
      flock_id,
      date,
      product_type,
      quantity,
      unit_price,
      customer_name,
      notes
    } = req.body;

    const result = await db.query(
      `INSERT INTO sales
      (flock_id, date, product_type, quantity, unit_price, customer_name, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        flock_id,
        date,
        product_type,
        quantity,
        unit_price,
        customer_name,
        notes
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Error creating sale:', err);
    res.status(500).json({
      message: 'Server error creating sale'
    });
  }
};

// GET all sales
const getSales = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        s.id,
        f.name AS flock_name,
        s.date,
        s.product_type,
        s.quantity,
        s.unit_price,
        s.total_amount,
        s.customer_name,
        s.notes,
        s.created_at
      FROM sales s
      JOIN flock f ON s.flock_id = f.id
      ORDER BY s.date DESC, s.id DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({
      message: 'Server error fetching sales'
    });
  }
};

module.exports = {
  createSale,
  getSales
};
