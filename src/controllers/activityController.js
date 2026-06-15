const db = require('../config/db');

// GET /api/activity - latest 100 for user's farm
const getActivities = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query(
      `SELECT title, description, activity_type, created_at
       FROM farm_activities
       WHERE farm_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [farm_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ message: 'Server error fetching activities' });
  }
};

module.exports = { getActivities };
