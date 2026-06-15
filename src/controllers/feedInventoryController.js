const db = require("../config/db");

// Helper: get authenticated user's farm_id
async function getUserFarmId(user_id) {
  const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
  if (u.rowCount === 0) return null;
  return u.rows[0].farm_id;
}

// GET all feed inventory for the user's farm
const getFeedInventory = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query(
      'SELECT * FROM feed_inventory WHERE farm_id = $1 AND COALESCE(is_deleted,false)=false ORDER BY id DESC',
      [farm_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching feed inventory:', err);
    res.status(500).json({ message: 'Server error fetching feed inventory', error: err.message });
  }
};

// CREATE feed stock (attach to user's farm)
const createFeedInventory = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const { feed_name, feed_type, quantity_kg, unit_cost, supplier } = req.body;

    const result = await db.query(
      `INSERT INTO feed_inventory 
      (farm_id, feed_name, feed_type, quantity_kg, unit_cost, supplier)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [farm_id, feed_name, feed_type, quantity_kg, unit_cost, supplier]
    );

    try {
      const activity = require('../utils/activity');
      const userRes = await db.query('SELECT name FROM users WHERE id = $1', [user_id]);
      const userName = userRes.rowCount > 0 ? userRes.rows[0].name : 'A user';
      await activity.createActivity({
        farm_id,
        user_id,
        activity_type: 'FEED_ADDED',
        title: 'Feed Added',
        description: `${userName} added ${quantity_kg}kg of ${feed_name}.`
      });
    } catch (e) {
      console.error('Activity logging failed for feed add:', e);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating feed inventory:', err);
    res.status(500).json({ message: 'Server error creating feed inventory', error: err.message });
  }
};

// UPDATE feed stock (ensure belongs to user's farm)
const updateFeedInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { feed_name, feed_type, quantity_kg, unit_cost, supplier } = req.body;

    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query(
      `UPDATE feed_inventory
       SET feed_name = $1, feed_type = $2, quantity_kg = $3, unit_cost = $4, supplier = $5
       WHERE id = $6 AND farm_id = $7
       RETURNING *`,
      [feed_name, feed_type, quantity_kg, unit_cost, supplier, id, farm_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Feed inventory not found or does not belong to your farm' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating feed inventory:', err);
    res.status(500).json({ message: 'Server error updating feed inventory', error: err.message });
  }
};

// DELETE feed stock (ensure belongs to user's farm)
const deleteFeedInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query('UPDATE feed_inventory SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Feed inventory not found or does not belong to your farm' });
    }
    res.json({ message: 'Feed inventory archived', data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting feed inventory:', err);
    res.status(500).json({ message: 'Server error deleting feed inventory', error: err.message });
  }
};
const restoreFeedInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const farm_id = await getUserFarmId(user_id);
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query('UPDATE feed_inventory SET is_deleted = false, deleted_at = NULL WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Feed inventory not found' });
    res.json({ message: 'Feed inventory restored', data: result.rows[0] });
  } catch (err) {
    console.error('Error restoring feed inventory:', err);
    res.status(500).json({ message: 'Server error restoring feed inventory', error: err.message });
  }
}

module.exports = {
  getFeedInventory,
  createFeedInventory,
  updateFeedInventory,
  deleteFeedInventory,
  restoreFeedInventory
};
