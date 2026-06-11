const db = require("../config/db");

// CREATE flock
const createFlock = async (req, res) => {
  try {
    const { name, type, quantity, start_date } = req.body;

    const result = await db.query(
      `INSERT INTO flock (name, type, quantity, start_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, type, quantity, start_date]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating flock:", err);
    res.status(500).json({ message: "Server error creating flock" });
  }
};

// GET all flocks
const getFlocks = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM flock ORDER BY id ASC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching flocks:", err);
    res.status(500).json({ message: "Server error fetching flocks" });
  }
};

module.exports = { createFlock, getFlocks };