const db = require('../config/db');

// CREATE treatment (farm-scoped)
const createTreatment = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { flock_id, disease, medication, cost, date_given, notes } = req.body;
    if (!disease || String(disease).trim() === '') return res.status(400).json({ message: 'Invalid disease/condition' });

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
      return res.status(403).json({ message: "Flock does not belong to user's farm" });
    }

    const result = await client.query(
      `INSERT INTO treatment
      (user_id, farm_id, flock_id, disease, medication, cost, date_given, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [userId, farm_id, flock_id, disease, medication, cost, date_given, notes]
    );

    await client.query('COMMIT');
    console.info(`Treatment created user=${userId} farm=${farm_id} flock=${flock_id} disease=${disease}`);
    try {
      const activity = require('../utils/activity');
      const userRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userRes.rowCount > 0 ? userRes.rows[0].name : 'A user';
      await activity.createActivity({
        farm_id,
        user_id: userId,
        activity_type: 'TREATMENT_RECORDED',
        title: 'Treatment Recorded',
        description: `${userName} recorded treatment '${medication}' for flock ${flock_id}.`
      });
    } catch (e) {
      console.error('Activity logging failed for treatment:', e);
    }

    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error creating treatment:', err);
    res.status(500).json({ message: 'Server error creating treatment', error: err.message });
  } finally {
    client.release();
  }
};

// GET treatments (farm-scoped)
const getTreatments = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const result = await db.query(`
      SELECT t.id, t.flock_id, f.name AS flock_name, t.disease, t.medication,
             t.cost, t.date_given, t.notes, t.created_at
      FROM treatment t
      JOIN flock f ON t.flock_id = f.id
      WHERE t.farm_id = $1 AND COALESCE(t.is_deleted, false) = false
      ORDER BY t.date_given DESC
    `, [farm_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching treatments:', err);
    res.status(500).json({ message: 'Server error fetching treatments', error: err.message });
  }
};

// UPDATE treatment (farm-scoped)
const updateTreatment = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const { flock_id, disease, medication, cost, date_given, notes } = req.body;
    if (!disease || String(disease).trim() === '') return res.status(400).json({ message: 'Invalid disease/condition' });

    await client.query('BEGIN');

    const oldRes = await client.query('SELECT * FROM treatment WHERE id = $1 AND farm_id = $2 FOR UPDATE', [id, farm_id]);
    if (oldRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Treatment not found' });
    }

    // Ensure new flock belongs to same farm
    const flockRes = await client.query('SELECT id, farm_id FROM flock WHERE id = $1 FOR UPDATE', [flock_id]);
    if (flockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Flock not found' });
    }
    if (flockRes.rows[0].farm_id !== farm_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "Flock does not belong to user's farm" });
    }

    const result = await client.query(
      `UPDATE treatment
       SET flock_id = $1, disease = $2, medication = $3, cost = $4, date_given = $5, notes = $6
       WHERE id = $7 AND farm_id = $8
       RETURNING *`,
      [flock_id, disease, medication, cost, date_given, notes, id, farm_id]
    );

    await client.query('COMMIT');
    console.info(`Treatment updated id=${id} farm=${farm_id} user=${userId}`);
    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error updating treatment:', err);
    res.status(500).json({ message: 'Server error updating treatment', error: err.message });
  } finally {
    client.release();
  }
};

// DELETE treatment (farm-scoped)
const deleteTreatment = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const result = await db.query('UPDATE treatment SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Treatment not found' });
    console.info(`Treatment archived id=${id} farm=${farm_id} user=${userId}`);
    res.json({ message: 'Treatment archived', data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting treatment:', err);
    res.status(500).json({ message: 'Server error deleting treatment', error: err.message });
  }
};

const restoreTreatment = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [userId]);
    const farm_id = userRes.rows[0] && userRes.rows[0].farm_id;
    if (!farm_id) return res.status(403).json({ message: 'User must belong to a farm' });

    const { id } = req.params;
    const result = await db.query('UPDATE treatment SET is_deleted = false, deleted_at = NULL WHERE id = $1 AND farm_id = $2 RETURNING *', [id, farm_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Treatment not found' });
    res.json({ message: 'Treatment restored', data: result.rows[0] });
  } catch (err) {
    console.error('Error restoring treatment:', err);
    res.status(500).json({ message: 'Server error restoring treatment', error: err.message });
  }
}

module.exports = { createTreatment, getTreatments, updateTreatment, deleteTreatment, restoreTreatment };
