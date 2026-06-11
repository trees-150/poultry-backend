const db = require('../config/db');

const createVaccination = async (req, res) => {
  try {
    const {
      flock_id,
      vaccine_name,
      date_administered,
      next_due_date,
      dose,
      administered_by,
      notes
    } = req.body;

    const result = await db.query(
      `INSERT INTO vaccination
      (flock_id, vaccine_name, date_administered, next_due_date, dose, administered_by, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        flock_id,
        vaccine_name,
        date_administered,
        next_due_date,
        dose,
        administered_by,
        notes
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating vaccination:', err);
    res.status(500).json({ message: 'Server error creating vaccination' });
  }
};

const getVaccinations = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.*, f.name AS flock_name
      FROM vaccination v
      JOIN flock f ON v.flock_id = f.id
      ORDER BY v.date_administered DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching vaccinations:', err);
    res.status(500).json({ message: 'Server error fetching vaccinations' });
  }
};

module.exports = { createVaccination, getVaccinations };
