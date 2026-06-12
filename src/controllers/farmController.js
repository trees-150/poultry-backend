const db = require('../config/db');

function generateInviteCode() {
  const prefix = 'PH';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const createFarm = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Farm name is required' });
    }

    // Try to insert a unique invite_code; loop on conflict
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
      attempts += 1;
      const invite_code = generateInviteCode();
      try {
        const result = await db.query(
          `INSERT INTO farms (name, invite_code, created_by)
           VALUES ($1, $2, $3)
           RETURNING id, name, invite_code`,
          [name.trim(), invite_code, user_id]
        );
        return res.status(201).json(result.rows[0]);
      } catch (err) {
        // If invite_code conflict, retry; otherwise bubble up
        if (err && err.code === '23505') {
          // conflict on unique invite_code, try again
          continue;
        }
        console.error('Error creating farm:', err);
        return res.status(500).json({ message: 'Server error creating farm' });
      }
    }

    return res.status(500).json({ message: 'Could not generate unique invite code' });
  } catch (err) {
    console.error('Unexpected error creating farm:', err);
    res.status(500).json({ message: 'Server error creating farm' });
  }
};

module.exports = { createFarm };
