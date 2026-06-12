const db = require('../config/db');

// CREATE vaccination (farm-scoped)
const createVaccination = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { flock_id, vaccine_name, dosage, date_given, notes } = req.body;
    if (!vaccine_name || String(vaccine_name).trim() === '') return res.status(400).json({ message: 'Invalid vaccine name' });

    await client.query('BEGIN');

    // Ensure flock exists and belongs to farm
    const flockRes = await client.query('SELECT id, farm_id, name FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (flockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Flock not found' });
    }
    const flock = flockRes.rows[0];
    if (flock.farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Flock does not belong to user\'s farm' });
    }

    const result = await client.query(
      `INSERT INTO vaccination
      (user_id, farm_id, flock_id, vaccine_name, dosage, date_given, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [userId, farm_id, flock_id, vaccine_name, dosage, date_given, notes]
    );

    await client.query('COMMIT');
    console.info(`Vaccination created user=${userId} farm=${farm_id} flock=${flock_id} vaccine=${vaccine_name}`);
    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error creating vaccination:', err);
    res.status(500).json({ message: 'Server error creating vaccination', error: err.message });
  } finally {
    client.release();
  }
};

// GET vaccinations (farm-scoped)
const getVaccinations = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const result = await db.query(`
      SELECT v.id, v.flock_id, f.name AS flock_name, v.vaccine_name,
             v.dosage, v.date_given, v.notes, v.created_at
      FROM vaccination v
      JOIN flock f ON v.flock_id = f.id
      WHERE v.farm_id = $1
      ORDER BY v.date_given DESC
    `, [farm_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching vaccinations:', err);
    res.status(500).json({ message: 'Server error fetching vaccinations', error: err.message });
  }
};

// UPDATE vaccination (farm-scoped)
const updateVaccination = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const { flock_id, vaccine_name, dosage, date_given, notes } = req.body;
    if (!vaccine_name || String(vaccine_name).trim() === '') return res.status(400).json({ message: 'Invalid vaccine name' });

    await client.query('BEGIN');

    const oldRes = await client.query('SELECT * FROM vaccination WHERE id = $1 AND farm_id = $2 FOR UPDATE', [id, farm_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vaccination not found' });
    }

    // Ensure new flock belongs to same farm
    const flockRes = await client.query('SELECT id, farm_id FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (flockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Flock not found' });
    }
    if (flockRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Flock does not belong to user\'s farm' });
    }

    const result = await client.query(
      `UPDATE vaccination
       SET flock_id = $1, vaccine_name = $2, dosage = $3, date_given = $4, notes = $5
       WHERE id = $6 AND farm_id = $7
       RETURNING *`,
      [flock_id, vaccine_name, dosage, date_given, notes, id, farm_id]
    );

    await client.query('COMMIT');
    console.info(`Vaccination updated id=${id} farm=${farm_id} user=${userId}`);
    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error updating vaccination:', err);
    res.status(500).json({ message: 'Server error updating vaccination', error: err.message });
  } finally {
    client.release();
  }
};

// DELETE vaccination (farm-scoped)
const deleteVaccination = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const result = await db.query('DELETE FROM vaccination WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);

    if (result.rowCount === 0) return res.status(404).json({ message: 'Vaccination not found' });
    console.info(`Vaccination deleted id=${id} farm=${farm_id} user=${userId}`);
    res.json({ message: 'Vaccination deleted', data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting vaccination:', err);
    res.status(500).json({ message: 'Server error deleting vaccination', error: err.message });
  }
};

module.exports = { createVaccination, getVaccinations, updateVaccination, deleteVaccination };
