const db = require('../config/db');
const { formatUGX } = require('../utils/currency');

// GET all expenses
const getExpenses = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM expenses ORDER BY expense_date DESC, id DESC"
    );
    const formatted = result.rows.map(r => ({
      ...r,
      amount: r.amount != null ? formatUGX(r.amount) : r.amount
    }));
    res.json(formatted);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({
      message: "Server error fetching expenses",
      error: err.message
    });
  }
};

// CREATE expense
const createExpense = async (req, res) => {
  try {
    const { category, amount, expense_date, description } = req.body;

    const result = await db.query(
      `INSERT INTO expenses
      (category, amount, expense_date, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [category, amount, expense_date, description]
    );

    const row = result.rows[0];
    if (row) row.amount = row.amount != null ? formatUGX(row.amount) : row.amount;
    res.json(row);
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({
      message: "Server error creating expense",
      error: err.message
    });
  }
};

module.exports = {
  getExpenses,
  createExpense
};
