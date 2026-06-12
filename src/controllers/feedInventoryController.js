const db = require("../config/db");

// GET all feed inventory
const getFeedInventory = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const result = await db.query(
      "SELECT * FROM feed_inventory WHERE user_id = $1 ORDER BY id DESC",
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching feed inventory:", err);
    res.status(500).json({
      message: "Server error fetching feed inventory",
      error: err.message
    });
  }
};

// CREATE feed stock
const createFeedInventory = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const { feed_name, feed_type, quantity_kg, unit_cost, supplier } = req.body;

    const result = await db.query(
      `INSERT INTO feed_inventory 
      (user_id, feed_name, feed_type, quantity_kg, unit_cost, supplier)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [user_id, feed_name, feed_type, quantity_kg, unit_cost, supplier]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating feed inventory:", err);
    res.status(500).json({
      message: "Server error creating feed inventory",
      error: err.message
    });
  }
};

// UPDATE feed stock
const updateFeedInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { feed_name, feed_type, quantity_kg, unit_cost, supplier } = req.body;

    const user_id = req.user && req.user.id;
    const result = await db.query(
      `UPDATE feed_inventory
       SET feed_name = $1, feed_type = $2, quantity_kg = $3, unit_cost = $4, supplier = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [feed_name, feed_type, quantity_kg, unit_cost, supplier, id, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Feed inventory not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating feed inventory:", err);
    res.status(500).json({
      message: "Server error updating feed inventory",
      error: err.message
    });
  }
};

// DELETE feed stock
const deleteFeedInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user && req.user.id;
    const result = await db.query("DELETE FROM feed_inventory WHERE id = $1 AND user_id = $2 RETURNING *", [id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Feed inventory not found" });
    }

    res.json({ message: "Feed inventory deleted", data: result.rows[0] });
  } catch (err) {
    console.error("Error deleting feed inventory:", err);
    res.status(500).json({
      message: "Server error deleting feed inventory",
      error: err.message
    });
  }
};

module.exports = {
  getFeedInventory,
  createFeedInventory,
  updateFeedInventory,
  deleteFeedInventory
};
