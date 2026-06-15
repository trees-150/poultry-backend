const db = require('../config/db');

// Helper to get user's farm_id
async function getUserFarmId(user_id) {
  const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
  if (u.rowCount === 0) return null;
  return u.rows[0].farm_id;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const exportFarmData = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    // Gather data
    const flocksQ = `SELECT name, quantity, type, start_date FROM flock WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`;
    const feedLogsQ = `SELECT f.name AS flock_name, fl.quantity_used, fl.date_used FROM feed_log fl JOIN flock f ON fl.flock_id = f.id WHERE fl.farm_id = $1 AND COALESCE(fl.is_deleted,false)=false AND COALESCE(f.is_deleted,false)=false ORDER BY fl.date_used`;
    const mortalityQ = `SELECT f.name AS flock_name, m.quantity, m.date_recorded FROM mortality m JOIN flock f ON m.flock_id = f.id WHERE m.farm_id = $1 AND COALESCE(m.is_deleted,false)=false AND COALESCE(f.is_deleted,false)=false ORDER BY m.date_recorded`;
    const salesQ = `SELECT f.name AS flock_name, s.quantity_sold AS quantity, s.total_amount AS amount, s.date_sold AS date FROM sales s JOIN flock f ON s.flock_id = f.id WHERE s.farm_id = $1 AND COALESCE(s.is_deleted,false)=false AND COALESCE(f.is_deleted,false)=false ORDER BY s.date_sold`;
    const expensesQ = `SELECT category, amount, expense_date FROM expenses WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY expense_date`;

    const [flocksRes, feedRes, mortRes, salesRes, expRes] = await Promise.all([
      db.query(flocksQ, [farm_id]),
      db.query(feedLogsQ, [farm_id]),
      db.query(mortalityQ, [farm_id]),
      db.query(salesQ, [farm_id]),
      db.query(expensesQ, [farm_id])
    ]);

    // Build CSV
    let csvParts = [];

    // Flocks
    csvParts.push('Flocks');
    csvParts.push(['name','quantity','type','start_date'].join(','));
    for (const r of flocksRes.rows) {
      csvParts.push([csvEscape(r.name), csvEscape(r.quantity), csvEscape(r.type), csvEscape(r.start_date)].join(','));
    }
    csvParts.push('');

    // Feed Logs
    csvParts.push('Feed Logs');
    csvParts.push(['flock_name','quantity_used','date_used'].join(','));
    for (const r of feedRes.rows) {
      csvParts.push([csvEscape(r.flock_name), csvEscape(r.quantity_used), csvEscape(r.date_used)].join(','));
    }
    csvParts.push('');

    // Mortality
    csvParts.push('Mortality');
    csvParts.push(['flock_name','quantity','date'].join(','));
    for (const r of mortRes.rows) {
      csvParts.push([csvEscape(r.flock_name), csvEscape(r.quantity), csvEscape(r.date_recorded)].join(','));
    }
    csvParts.push('');

    // Sales
    csvParts.push('Sales');
    csvParts.push(['flock_name','quantity','amount','date'].join(','));
    for (const r of salesRes.rows) {
      csvParts.push([csvEscape(r.flock_name), csvEscape(r.quantity), csvEscape(r.amount), csvEscape(r.date)].join(','));
    }
    csvParts.push('');

    // Expenses
    csvParts.push('Expenses');
    csvParts.push(['category','amount','date'].join(','));
    for (const r of expRes.rows) {
      csvParts.push([csvEscape(r.category), csvEscape(r.amount), csvEscape(r.expense_date)].join(','));
    }

    const csv = csvParts.join('\n');

    const filename = `poultryhouse-farm-${farm_id}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting farm data:', err);
    res.status(500).json({ message: 'Server error exporting farm data', error: err.message });
  }
};

module.exports = { exportFarmData };
