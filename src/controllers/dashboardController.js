const db = require('../config/db');

const getDashboardSummary = async (req, res) => {
  try {
    // Total Revenue
    const revenueResult = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS revenue
      FROM sales
    `);

    // Total Expenses
    const expenseResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS expenses
      FROM expense
    `);

    // Current flock count
    const flockResult = await db.query(`
      SELECT COALESCE(SUM(quantity), 0) AS flock_count
      FROM flock
    `);

    // Feed purchased
    const feedResult = await db.query(`
      SELECT COALESCE(SUM(quantity), 0) AS feed_stock
      FROM feed_inventory
    `);

    const revenue = parseFloat(revenueResult.rows[0].revenue);
    const expenses = parseFloat(expenseResult.rows[0].expenses);
    const profit = revenue - expenses;
    const { formatUGX } = require('../utils/currency');

    res.json({
      revenue: formatUGX(revenue),
      expenses: formatUGX(expenses),
      profit: formatUGX(profit),
      flock_count: flockResult.rows[0].flock_count,
      feed_stock: feedResult.rows[0].feed_stock
    });

  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({
      message: 'Server error fetching dashboard'
    });
  }
};

module.exports = {
  getDashboardSummary
};
