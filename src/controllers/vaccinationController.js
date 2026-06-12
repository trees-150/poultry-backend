const db = require('../config/db');

const createVaccination = async (req, res) => {
  try {
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

const updateVaccination = async (req, res) => {
  try {
    const { id } = req.params;
    const { flock_id, vaccine_name, dosage, date_given, notes } = req.body;

    const result = await db.query(
      `UPDATE vaccination
       SET flock_id = $1, vaccine_name = $2, dosage = $3, date_given = $4, notes = $5
       WHERE id = $6
       RETURNING *`,
      [flock_id, vaccine_name, dosage, date_given, notes, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Vaccination not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating vaccination:', err);
    res.status(500).json({ message: 'Server error updating vaccination', error: err.message });
  }
};

const deleteVaccination = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("DELETE FROM vaccination WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Vaccination not found" });
    }

    res.json({ message: "Vaccination deleted", data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting vaccination:', err);
    res.status(500).json({ message: 'Server error deleting vaccination', error: err.message });
  }
};

module.exports = { createVaccination, getVaccinations, updateVaccination, deleteVaccination };
