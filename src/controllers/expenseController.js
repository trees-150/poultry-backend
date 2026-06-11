const db = require('../config/db');

// CREATE expense
const createExpense = async (req, res) => {
  try {
    const {
      date,
      category,
      amount,
      description,
      vendor,
      receipt_number
    } = req.body;

    const result = await db.query(
      `INSERT INTO expense
      (date, category, amount, description, vendor, receipt_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [date, category, amount, description, vendor, receipt_number]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({
      message: 'Server error creating expense'
    });
  }
};

// GET all expenses
const getExpenses = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM expense ORDER BY date DESC, id DESC`
    );

    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({
      message: 'Server error fetching expenses'
    });
  }
};

module.exports = {
  createExpense,
  getExpenses
};
