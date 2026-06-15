const db = require('../config/db');

// Get notifications for user's farm (scoped by farm_id)
const getNotifications = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query('SELECT * FROM notifications WHERE farm_id = $1 ORDER BY created_at DESC', [farm_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const r = await db.query('SELECT COUNT(*)::int AS count FROM notifications WHERE farm_id = $1 AND is_read = false', [farm_id]);
    res.json({ count: r.rows[0].count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ message: 'Server error fetching unread count' });
  }
};

// Mark single notification as read (scoped to farm)
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const result = await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Server error marking notification' });
  }
};

// Mark all as read for this farm
const markAllRead = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });
    const u = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = u.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    await db.query('UPDATE notifications SET is_read = true WHERE farm_id = $1 AND is_read = false', [farm_id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Server error marking notifications' });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllRead };
