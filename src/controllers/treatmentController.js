const db = require('../config/db');

const createTreatment = async (req, res) => {
  try {
    const {
      flock_id,
      disease,
      medication,
      dosage,
      start_date,
      end_date,
      administered_by,
      notes
    } = req.body;

    const result = await db.query(
      `INSERT INTO treatment
      (flock_id, disease, medication, dosage, start_date, end_date, administered_by, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        flock_id,
        disease,
        medication,
        dosage,
        start_date,
        end_date,
        administered_by,
        notes
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating treatment:', err);
    res.status(500).json({ message: 'Server error creating treatment' });
  }
};

const getTreatments = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, f.name AS flock_name
      FROM treatment t
      JOIN flock f ON t.flock_id = f.id
      ORDER BY t.start_date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching treatments:', err);
    res.status(500).json({ message: 'Server error fetching treatments' });
  }
};

module.exports = { createTreatment, getTreatments };
