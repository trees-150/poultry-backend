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
    const result = await db.query("SELECT * FROM flock ORDER BY id DESC");
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

    const result = await db.query(
      `UPDATE flock
       SET name = $1, type = $2, quantity = $3, start_date = $4
       WHERE id = $5
       RETURNING *`,
      [name, type, quantity, start_date, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Flock not found" });
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
    const result = await db.query("DELETE FROM flock WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Flock not found" });
    }

    res.json({ message: "Flock deleted", data: result.rows[0] });
  } catch (err) {
    console.error("Error deleting flock:", err);
    res.status(500).json({ message: "Server error deleting flock" });
  }
};

module.exports = { createFlock, getFlocks, updateFlock, deleteFlock };
