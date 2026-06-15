const db = require('../config/db');

// GET all expenses (farm-scoped)
const getExpenses = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const result = await db.query(
      'SELECT * FROM expenses WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY expense_date DESC, id DESC',
      [farm_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ message: 'Server error fetching expenses', error: err.message });
  }
};

// CREATE expense (farm-scoped)
const createExpense = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { category, amount, expense_date, description } = req.body;
    if (!category || String(category).trim() === '') return res.status(400).json({ message: 'Invalid or empty category' });
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ message: 'amount must be > 0' });

    const result = await db.query(
      `INSERT INTO expenses
      (user_id, farm_id, category, amount, expense_date, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [userId, farm_id, category, amt, expense_date, description]
    );

    console.info(`Expense created user=${userId} farm=${farm_id} category=${category} amount=${amt}`);
    try {
      const activity = require('../utils/activity');
      const userRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userRes.rowCount > 0 ? userRes.rows[0].name : 'A user';
      await activity.createActivity({
        farm_id,
        user_id: userId,
        activity_type: 'EXPENSE_RECORDED',
        title: 'Expense Recorded',
        description: `${userName} recorded expense '${category}' amount ${amt}.`
      });
    } catch (e) {
      console.error('Activity logging failed for expense create:', e);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ message: 'Server error creating expense', error: err.message });
  }
};

// UPDATE expense (farm-scoped)
const updateExpense = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const { category, amount, expense_date, description } = req.body;
    if (!category || String(category).trim() === '') return res.status(400).json({ message: 'Invalid or empty category' });
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ message: 'amount must be > 0' });

    const result = await db.query(
      `UPDATE expenses
       SET category = $1, amount = $2, expense_date = $3, description = $4
       WHERE id = $5 AND farm_id = $6
       RETURNING *`,
      [category, amt, expense_date, description, id, farm_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    console.info(`Expense updated id=${id} farm=${farm_id} user=${userId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ message: 'Server error updating expense', error: err.message });
  }
};

// DELETE expense (farm-scoped)
const deleteExpense = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const result = await db.query('UPDATE expenses SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    console.info(`Expense archived id=${id} farm=${farm_id} user=${userId}`);
    res.json({ message: 'Expense archived', data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ message: 'Server error deleting expense', error: err.message });
  }
};

const restoreExpense = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const result = await db.query('UPDATE expenses SET is_deleted = false, deleted_at = NULL WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense restored', data: result.rows[0] });
  } catch (err) {
    console.error('Error restoring expense:', err);
    res.status(500).json({ message: 'Server error restoring expense', error: err.message });
  }
}

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  restoreExpense
};
