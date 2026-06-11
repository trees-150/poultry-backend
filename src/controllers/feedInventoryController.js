const db = require("../config/db");

// GET all feed inventory
const getFeedInventory = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM feed_inventory ORDER BY id DESC"
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
    const { feed_name, feed_type, quantity_kg, unit_cost, supplier } = req.body;

    const result = await db.query(
      `INSERT INTO feed_inventory 
      (feed_name, feed_type, quantity_kg, unit_cost, supplier)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [feed_name, feed_type, quantity_kg, unit_cost, supplier]
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

module.exports = {
  getFeedInventory,
  createFeedInventory
};
const db = require('../config/db');

// CREATE feed stock
const createFeed = async (req, res) => {
  try {
    const { feed_type, quantity, unit, cost_per_unit, date_added } = req.body;

    const result = await db.query(
      `INSERT INTO feed_inventory 
       (feed_type, quantity, unit, cost_per_unit, date_added)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [feed_type, quantity, unit, cost_per_unit, date_added]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating feed:', err);
    res.status(500).json({ message: 'Server error creating feed' });
  }
};

// GET all feed stock
const getFeed = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM feed_inventory ORDER BY id ASC'
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching feed:', err);
    res.status(500).json({ message: 'Server error fetching feed' });
  }
};

module.exports = { createFeed, getFeed };
