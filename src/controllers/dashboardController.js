const db = require('../config/db');

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const q = `SELECT
      (SELECT COUNT(*) FROM flock WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_flocks,
      (SELECT COALESCE(SUM(quantity),0) FROM flock WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_birds,
      (SELECT COALESCE(SUM(quantity_kg),0) FROM feed_inventory WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_feed_inventory,
      (SELECT COALESCE(SUM(quantity_used),0) FROM feed_log WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_feed_used,
      (SELECT COALESCE(SUM(quantity),0) FROM mortality WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_mortality,
      (SELECT COUNT(*) FROM vaccination WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_vaccinations,
      (SELECT COUNT(*) FROM treatment WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_treatments,
      (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_sales_amount,
      (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false) AS total_expenses_amount
    `;

    const agg = await db.query(q, [farm_id]);
    const row = agg.rows[0] || {};

    const total_sales = parseFloat(row.total_sales_amount) || 0;
    const total_expenses = parseFloat(row.total_expenses_amount) || 0;
    const net_profit = total_sales - total_expenses;

    res.json({
      flocks: {
        total_flocks: Number(row.total_flocks) || 0,
        total_birds: Number(row.total_birds) || 0
      },
      feed: {
        total_feed_inventory: Number(row.total_feed_inventory) || 0,
        total_feed_used: Number(row.total_feed_used) || 0
      },
      health: {
        total_mortality: Number(row.total_mortality) || 0,
        vaccinations: Number(row.total_vaccinations) || 0,
        treatments: Number(row.total_treatments) || 0
      },
      finance: {
        sales: total_sales,
        expenses: total_expenses,
        net_profit: net_profit
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ message: 'Server error fetching dashboard summary', error: err.message });
  }
};

module.exports = { getDashboardSummary };
