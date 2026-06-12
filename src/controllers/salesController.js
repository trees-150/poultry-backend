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
  try {
    const {
      flock_id,
      quantity_sold,
      price_per_unit,
      buyer_name,
      date_sold,
      notes
    } = req.body;

    const total_amount = quantity_sold * price_per_unit;

    const result = await db.query(
      `INSERT INTO sales 
      (flock_id, quantity_sold, price_per_unit, total_amount, buyer_name, date_sold, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        flock_id,
        quantity_sold,
        price_per_unit,
        total_amount,
        buyer_name,
        date_sold,
        notes
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating sale:", err);
    res.status(500).json({
      message: "Server error creating sale",
      error: err.message
    });
  }
};

module.exports = { getSales, createSale };
