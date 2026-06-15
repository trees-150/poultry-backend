const db = require("../config/db");

// CREATE flock (owned by farm)
const createFlock = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    // Get user's farm_id
    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const { name, type, quantity, start_date } = req.body;
    if (!name) return res.status(400).json({ message: 'Flock name is required' });

    const result = await db.query(
      `INSERT INTO flock (farm_id, name, type, quantity, start_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [farm_id, name, type, quantity, start_date]
    );

    try {
      const activity = require('../utils/activity');
      const userRes = await db.query('SELECT name FROM users WHERE id = $1', [user_id]);
      const userName = userRes.rowCount > 0 ? userRes.rows[0].name : 'A user';
      await activity.createActivity({
        farm_id,
        user_id,
        activity_type: 'FLOCK_CREATED',
        title: 'Flock Created',
        description: `${userName} created flock '${name}' with ${quantity} birds.`
      });
    } catch (e) {
      console.error('Activity logging failed for flock create:', e);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating flock:", err);
    res.status(500).json({ message: "Server error creating flock" });
  }
};

// GET all flocks
const getFlocks = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.json([]);

    const result = await db.query('SELECT * FROM flock WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id DESC', [farm_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching flocks:", err);
    res.status(500).json({
      message: "Server error fetching flocks",
      error: err.message
    });
  }
};

// UPDATE flock
const updateFlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, quantity, start_date } = req.body;
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query(
      `UPDATE flock
       SET name = $1, type = $2, quantity = $3, start_date = $4
       WHERE id = $5 AND farm_id = $6
       RETURNING *`,
      [name, type, quantity, start_date, id, farm_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Flock not found or does not belong to your farm" });
    }

    try {
      const activity = require('../utils/activity');
      const userRes = await db.query('SELECT name FROM users WHERE id = $1', [user_id]);
      const userName = userRes.rowCount > 0 ? userRes.rows[0].name : 'A user';
      await activity.createActivity({
        farm_id,
        user_id,
        activity_type: 'FLOCK_UPDATED',
        title: 'Flock Updated',
        description: `${userName} updated flock '${name}'.`
      });
    } catch (e) {
      console.error('Activity logging failed for flock update:', e);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating flock:", err);
    res.status(500).json({ message: "Server error updating flock" });
  }
};

// DELETE flock
const deleteFlock = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query(
      `UPDATE flock SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND farm_id = $2 RETURNING *`,
      [id, farm_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Flock not found or does not belong to your farm" });
    }

    try {
      const activity = require('../utils/activity');
      const userRes = await db.query('SELECT name FROM users WHERE id = $1', [user_id]);
      const userName = userRes.rowCount > 0 ? userRes.rows[0].name : 'A user';
      await activity.createActivity({
        farm_id,
        user_id,
        activity_type: 'FLOCK_DELETED',
        title: 'Flock Deleted',
        description: `${userName} deleted flock '${result.rows[0].name || 'unknown'}'.`
      });
    } catch (e) {
      console.error('Activity logging failed for flock delete:', e);
    }

    res.json({ message: "Flock deleted", data: result.rows[0] });
  } catch (err) {
    console.error("Error deleting flock:", err);
    res.status(500).json({ message: "Server error deleting flock" });
  }
};

// Restore flock
const restoreFlock = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query(`UPDATE flock SET is_deleted = false, deleted_at = NULL WHERE id = $1 AND farm_id = $2 RETURNING *`, [id, farm_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Flock not found or does not belong to your farm' });

    res.json({ message: 'Flock restored', data: result.rows[0] });
  } catch (err) {
    console.error('Error restoring flock:', err);
    res.status(500).json({ message: 'Server error restoring flock' });
  }
}

module.exports = { createFlock, getFlocks, updateFlock, deleteFlock, restoreFlock };
