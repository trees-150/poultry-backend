const db = require('../config/db');
const { formatUGX } = require('../utils/currency');

const createTreatment = async (req, res) => {
  try {
    const { flock_id, disease, medication, cost, date_given, notes } = req.body;

    const result = await db.query(
      `INSERT INTO treatment
      (flock_id, disease, medication, cost, date_given, notes)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [flock_id, disease, medication, cost, date_given, notes]
    );

    const row = result.rows[0];
    if (row) row.cost = row.cost != null ? formatUGX(row.cost) : row.cost;
    res.json(row);
  } catch (err) {
    console.error('Error creating treatment:', err);
    res.status(500).json({ message: 'Server error creating treatment', error: err.message });
  }
};

const getTreatments = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.id, t.flock_id, f.name AS flock_name, t.disease, t.medication,
             t.cost, t.date_given, t.notes, t.created_at
      FROM treatment t
      JOIN flock f ON t.flock_id = f.id
      ORDER BY t.date_given DESC
    `);

    const formatted = result.rows.map(r => ({
      ...r,
      cost: r.cost != null ? formatUGX(r.cost) : r.cost
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching treatments:', err);
    res.status(500).json({ message: 'Server error fetching treatments' });
  }
};

module.exports = { createTreatment, getTreatments };
