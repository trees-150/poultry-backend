const db = require('../config/db');

// Helper to get user's farm_id
async function getUserFarmId(user_id) {
  const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
  if (u.rowCount === 0) return null;
  return u.rows[0].farm_id;
}

function sanitizeRow(row) {
  const copy = { ...row };
  // Remove commonly sensitive fields just in case
  delete copy.password;
  delete copy.passphrase;
  delete copy.salt;
  delete copy.auth_token;
  delete copy.token;
  return copy;
}

const getBackup = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    // Query all relevant tables, excluding soft-deleted records and scoped to farm
    const queries = {
      flocks: `SELECT * FROM flock WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`,
      feed_inventory: `SELECT * FROM feed_inventory WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`,
      feed_log: `SELECT * FROM feed_log WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`,
      mortality: `SELECT * FROM mortality WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`,
      sales: `SELECT * FROM sales WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`,
      expenses: `SELECT * FROM expenses WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`,
      vaccinations: `SELECT * FROM vaccination WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`,
      treatments: `SELECT * FROM treatment WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id`
    };

    const keys = Object.keys(queries);
    const promises = keys.map(k => db.query(queries[k], [farm_id]));
    const results = await Promise.all(promises);

    const data = {};
    for (let i = 0; i < keys.length; i++) {
      data[keys[i]] = results[i].rows.map(r => sanitizeRow(r));
    }

    const backup = {
      farm_id: farm_id,
      timestamp: new Date().toISOString(),
      data
    };

    res.json(backup);
  } catch (err) {
    console.error('Error generating backup:', err);
    res.status(500).json({ message: 'Server error generating backup', error: err.message });
  }
};

// Restore is intentionally disabled by default; admin-only stub
const restoreBackup = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const u = await db.query('SELECT role, farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const role = u.rows[0].role;
    if (role !== 'admin') return res.status(403).json({ message: 'Restore only available to admin users' });

    // For safety, do not implement automatic restore here. Return not implemented.
    return res.status(501).json({ message: 'Restore endpoint is disabled. Contact admin to perform manual restore.' });
  } catch (err) {
    console.error('Error in restore endpoint:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getBackup, restoreBackup };
