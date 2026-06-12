const db = require('../config/db');

const createVaccination = async (req, res) => {
  try {
    // Accept the requested payload keys and use DB columns directly
    const { flock_id, vaccine_name, dosage, date_given, notes } = req.body;

    const result = await db.query(
      `INSERT INTO vaccination
      (flock_id, vaccine_name, dosage, date_given, notes)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *`,
      [flock_id, vaccine_name, dosage, date_given, notes]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating vaccination:', err);
    res.status(500).json({ message: 'Server error creating vaccination', error: err.message });
  }
};

const getVaccinations = async (req, res) => {
  try {

    const result = await db.query(`
      SELECT v.id, v.flock_id, f.name AS flock_name, v.vaccine_name,
             v.dosage, v.date_given, v.notes, v.created_at
      FROM vaccination v
      JOIN flock f ON v.flock_id = f.id
      ORDER BY v.date_given DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching vaccinations:', err);
    res.status(500).json({ message: 'Server error fetching vaccinations' });
  }
};

module.exports = { createVaccination, getVaccinations };
