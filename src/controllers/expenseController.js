const db = require('../config/db');

// GET all expenses
const getExpenses = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const result = await db.query(
      "SELECT * FROM expenses WHERE user_id = $1 ORDER BY expense_date DESC, id DESC",
      [user_id]
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

    const user_id = req.user && req.user.id;
    const { category, amount, expense_date, description } = req.body;

    const result = await db.query(
      `INSERT INTO expenses
      (user_id, category, amount, expense_date, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [user_id, category, amount, expense_date, description]
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

// UPDATE expense
const updateExpense = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const { id } = req.params;
    const { category, amount, expense_date, description } = req.body;

    const result = await db.query(
      `UPDATE expenses
       SET category = $1, amount = $2, expense_date = $3, description = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [category, amount, expense_date, description, id, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({
      message: "Server error updating expense",
      error: err.message
    });
  }
};

// DELETE expense
const deleteExpense = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const { id } = req.params;
    const result = await db.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *", [id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted", data: result.rows[0] });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({
      message: "Server error deleting expense",
      error: err.message
    });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
};
