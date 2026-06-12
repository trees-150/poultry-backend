const db = require("../config/db");
const { formatUGX } = require('../utils/currency');

// GET all feed inventory
const getFeedInventory = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM feed_inventory ORDER BY id DESC"
    );
    const formatted = result.rows.map(r => ({
      ...r,
      unit_cost: r.unit_cost != null ? formatUGX(r.unit_cost) : r.unit_cost
    }));
    res.json(formatted);
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
    const { feed_name, feed_type, quantity_kg, unit_cost, supplier } = req.body;

    const result = await db.query(
      `INSERT INTO feed_inventory 
      (feed_name, feed_type, quantity_kg, unit_cost, supplier)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [feed_name, feed_type, quantity_kg, unit_cost, supplier]
    );

    const row = result.rows[0];
    if (row) row.unit_cost = row.unit_cost != null ? formatUGX(row.unit_cost) : row.unit_cost;
    res.json(row);
  } catch (err) {
    console.error("Error creating feed inventory:", err);
    res.status(500).json({
      message: "Server error creating feed inventory",
      error: err.message
    });
  }
};

module.exports = {
  getFeedInventory,
  createFeedInventory
};

