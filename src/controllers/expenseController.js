const db = require('../config/db');

// GET all expenses
const getExpenses = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM expenses ORDER BY expense_date DESC, id DESC"
    );
    res.json(result.rows);
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

    res.json(result.rows[0]);
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
