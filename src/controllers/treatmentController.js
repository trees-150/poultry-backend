const db = require('../config/db');

const createTreatment = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const { flock_id, disease, medication, cost, date_given, notes } = req.body;

    const result = await db.query(
      `INSERT INTO treatment
      (user_id, flock_id, disease, medication, cost, date_given, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [user_id, flock_id, disease, medication, cost, date_given, notes]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating treatment:', err);
    res.status(500).json({ message: 'Server error creating treatment', error: err.message });
  }
};

const getTreatments = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const result = await db.query(`
      SELECT t.id, t.flock_id, f.name AS flock_name, t.disease, t.medication,
             t.cost, t.date_given, t.notes, t.created_at
      FROM treatment t
      JOIN flock f ON t.flock_id = f.id
      WHERE t.user_id = $1
      ORDER BY t.date_given DESC
    `, [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching treatments:', err);
    res.status(500).json({ message: 'Server error fetching treatments' });
  }
};

const updateTreatment = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const { id } = req.params;
    const { flock_id, disease, medication, cost, date_given, notes } = req.body;

    const result = await db.query(
      `UPDATE treatment
       SET flock_id = $1, disease = $2, medication = $3, cost = $4, date_given = $5, notes = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [flock_id, disease, medication, cost, date_given, notes, id, user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Treatment not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating treatment:', err);
    res.status(500).json({ message: 'Server error updating treatment', error: err.message });
  }
};

const deleteTreatment = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    const { id } = req.params;
    const result = await db.query("DELETE FROM treatment WHERE id = $1 AND user_id = $2 RETURNING *", [id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Treatment not found" });
    }

    res.json({ message: "Treatment deleted", data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting treatment:', err);
    res.status(500).json({ message: 'Server error deleting treatment', error: err.message });
  }
};

module.exports = { createTreatment, getTreatments, updateTreatment, deleteTreatment };
