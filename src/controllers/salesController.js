const db = require("../config/db");
const { formatUGX } = require('../utils/currency');

// GET sales
const getSales = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM sales ORDER BY id DESC"
    );
    const formatted = result.rows.map(r => ({
      ...r,
      price_per_unit: r.price_per_unit != null ? formatUGX(r.price_per_unit) : r.price_per_unit,
      total_amount: r.total_amount != null ? formatUGX(r.total_amount) : r.total_amount
    }));
    res.json(formatted);
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

    const row = result.rows[0];
    if (row) {
      row.price_per_unit = row.price_per_unit != null ? formatUGX(row.price_per_unit) : row.price_per_unit;
      row.total_amount = row.total_amount != null ? formatUGX(row.total_amount) : row.total_amount;
    }
    res.json(row);
  } catch (err) {
    console.error("Error creating sale:", err);
    res.status(500).json({
      message: "Server error creating sale",
      error: err.message
    });
  }
};

module.exports = { getSales, createSale };
