const db = require('../config/db');

// @desc    Add a new egg production record
// @route   POST /api/eggs
const addEggRecord = async (req, res) => {
  const { flock_id, date, quantity } = req.body;

  if (!date || quantity === undefined) {
    return res.status(400).json({ message: 'Please provide date and quantity of eggs collected' });
  }

  try {
    const queryText = 'INSERT INTO eggs_collected (flock_id, date, quantity) VALUES ($1, $2, $3) RETURNING *';
    const values = [flock_id, date, quantity];
    const result = await db.query(queryText, values);

    res.status(201).json({
      message: 'Egg production record added successfully',
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Error saving egg record:', error);
    res.status(500).json({ message: 'Server error while saving data' });
  }
};

// @desc    Get all egg production records
// @route   GET /api/eggs
const getEggRecords = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM eggs_collected ORDER BY date DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching egg records:', error);
    res.status(500).json({ message: 'Server error while fetching data' });
  }
};

module.exports = {
  addEggRecord,
  getEggRecords,
};