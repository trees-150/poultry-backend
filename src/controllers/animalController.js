const db = require('../config/db');

// @desc    Add a new animal record
// @route   POST /api/animals
const addAnimal = async (req, res) => {
  const { name, age } = req.body;

  if (!name || !age) {
    return res.status(400).json({ message: 'Please provide name and age' });
  }

  try {
    const queryText = 'INSERT INTO animals (name, age) VALUES ($1, $2) RETURNING *';
    const values = [name, age];
    const result = await db.query(queryText, values);

    res.status(201).json({
      message: 'Animal added successfully',
      animal: result.rows[0],
    });
  } catch (error) {
    console.error('Error saving animal:', error);
    res.status(500).json({ message: 'Server error while saving data' });
  }
};

// @desc    Get all animal records
// @route   GET /api/animals
const getAnimals = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM animals ORDER BY id DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching animals:', error);
    res.status(500).json({ message: 'Server error while fetching data' });
  }
};

module.exports = {
  addAnimal,
  getAnimals,
};