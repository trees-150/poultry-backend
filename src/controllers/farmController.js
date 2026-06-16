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
  const client = await db.pool.connect();
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Farm name is required' });
    }

    await client.query('BEGIN');

    // Try to insert a unique invite_code; loop on conflict
    let attempts = 0;
    const maxAttempts = 5;
    let inserted = null;
    while (attempts < maxAttempts) {
      attempts += 1;
      const invite_code = generateInviteCode();
      try {
        const result = await client.query(
          `INSERT INTO farms (name, invite_code, created_by)
           VALUES ($1, $2, $3)
           RETURNING id, name, invite_code`,
          [name.trim(), invite_code, user_id]
        );
        inserted = result.rows[0];

        // ensure farm_members table exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS farm_members (
            id SERIAL PRIMARY KEY,
            farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            UNIQUE(farm_id, user_id)
          )
        `);

        // insert membership as owner (do not overwrite existing memberships)
        await client.query(
          `INSERT INTO farm_members (farm_id, user_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (farm_id, user_id) DO NOTHING`,
          [inserted.id, user_id, 'owner']
        );

        // set user's active_farm_id and set legacy farm_id/role only if not set
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_farm_id INTEGER`);
        const uRes = await client.query('SELECT farm_id FROM users WHERE id = $1 FOR UPDATE', [user_id]);
        const currentFarmId = (uRes.rowCount > 0) ? uRes.rows[0].farm_id : null;
        if (currentFarmId === null) {
          await client.query(
            `UPDATE users SET farm_id = $1, role = $2, active_farm_id = $1 WHERE id = $3`,
            [inserted.id, 'owner', user_id]
          );
        } else {
          await client.query(
            `UPDATE users SET active_farm_id = $1 WHERE id = $2`,
            [inserted.id, user_id]
          );
        }

        break;
      } catch (err) {
        // If invite_code conflict, retry; otherwise bubble up
        if (err && err.code === '23505') {
          continue;
        }
        console.error('Error creating farm:', err);
        await client.query('ROLLBACK');
        return res.status(500).json({ message: 'Server error creating farm' });
      }
    }

    if (!inserted) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: 'Could not generate unique invite code' });
    }

    await client.query('COMMIT');
    return res.status(201).json(inserted);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Unexpected error creating farm:', err);
    res.status(500).json({ message: 'Server error creating farm' });
  } finally {
    client.release();
  }
};

const getMyFarm = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const result = await db.query(
      `SELECT u.farm_id, u.role, f.name AS farm_name, f.invite_code
       FROM users u
       LEFT JOIN farms f ON u.farm_id = f.id
       WHERE u.id = $1`,
      [user_id]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({ farm_id: null, role: null });
    }

    const row = result.rows[0];
    if (!row.farm_id) {
      return res.status(200).json({ farm_id: null, role: null });
    }

    res.json({
      farm_id: row.farm_id,
      farm_name: row.farm_name,
      invite_code: row.invite_code,
      role: row.role
    });
  } catch (err) {
    console.error('Error fetching my farm:', err);
    res.status(500).json({ message: 'Server error fetching farm' });
  }
};

const getMyFarms = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    // ensure farm_members exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS farm_members (
        id SERIAL PRIMARY KEY,
        farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        UNIQUE(farm_id, user_id)
      )
    `);

    const result = await db.query(
      `SELECT f.id, f.name, fm.role, f.invite_code
       FROM farm_members fm
       JOIN farms f ON fm.farm_id = f.id
       WHERE fm.user_id = $1
       ORDER BY f.id ASC`,
      [user_id]
    );

    const out = result.rows.map(r => ({ id: r.id, name: r.name, role: r.role, invite_code: r.invite_code }));
    res.json(out);
  } catch (err) {
    console.error('Error fetching my farms:', err);
    res.status(500).json({ message: 'Server error fetching farms' });
  }
};

const switchFarm = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const { farm_id } = req.body || {};
    if (!farm_id) return res.status(400).json({ message: 'farm_id is required' });

    // ensure farm_members exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS farm_members (
        id SERIAL PRIMARY KEY,
        farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        UNIQUE(farm_id, user_id)
      )
    `);

    // verify membership
    const mRes = await db.query('SELECT role FROM farm_members WHERE farm_id = $1 AND user_id = $2', [farm_id, user_id]);
    if (mRes.rowCount === 0) {
      return res.status(403).json({ message: 'User does not belong to the specified farm' });
    }

    // ensure active_farm_id column
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_farm_id INTEGER`);

    await db.query('UPDATE users SET active_farm_id = $1 WHERE id = $2', [farm_id, user_id]);

    res.json({ message: 'Active farm switched successfully', active_farm_id: farm_id });
  } catch (err) {
    console.error('Error switching active farm:', err);
    res.status(500).json({ message: 'Server error switching farm' });
  }
};

const joinFarm = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const { invite_code } = req.body;
    if (!invite_code || typeof invite_code !== 'string') {
      return res.status(400).json({ message: 'invite_code is required' });
    }

    await client.query('BEGIN');

    // Find farm by invite_code
    const farmRes = await client.query('SELECT id, name FROM farms WHERE invite_code = $1', [invite_code]);
    if (farmRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Invite code not found' });
    }
    const farm = farmRes.rows[0];

    // ensure farm_members table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS farm_members (
        id SERIAL PRIMARY KEY,
        farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        UNIQUE(farm_id, user_id)
      )
    `);

    // Try to insert membership; if exists, return message
    const insertRes = await client.query(
      `INSERT INTO farm_members (farm_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (farm_id, user_id) DO NOTHING
       RETURNING id`,
      [farm.id, user_id, 'member']
    );

    if (insertRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({ message: 'Already a member of this farm' });
    }

    // ensure active_farm_id column exists and set it to joined farm
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_farm_id INTEGER`);
    const uRes = await client.query('SELECT farm_id FROM users WHERE id = $1 FOR UPDATE', [user_id]);
    const currentFarmId = (uRes.rowCount > 0) ? uRes.rows[0].farm_id : null;

    if (currentFarmId === null) {
      // legacy behaviour: set farm_id and role only if unset
      await client.query('UPDATE users SET farm_id = $1, role = $2, active_farm_id = $1 WHERE id = $3', [farm.id, 'member', user_id]);
    } else {
      await client.query('UPDATE users SET active_farm_id = $1 WHERE id = $2', [farm.id, user_id]);
    }

    await client.query('COMMIT');

    // Notify farm members about new member (farm-wide)
    try {
      const uRes2 = await db.query('SELECT name FROM users WHERE id = $1', [user_id]);
      const userName = (uRes2.rowCount > 0 && uRes2.rows[0].name) ? uRes2.rows[0].name : 'A member';
      const notifications = require('../utils/notifications');
      await notifications.createNotification({
        farm_id: farm.id,
        title: 'New Farm Member Joined',
        message: `${userName} joined the farm.`,
        type: 'member_joined'
      });
      const activity = require('../utils/activity');
      await activity.createActivity({
        farm_id: farm.id,
        user_id: user_id,
        activity_type: 'FARM_MEMBER_JOINED',
        title: 'Farm Member Joined',
        description: `${userName} joined the farm.`
      });
    } catch (nerr) {
      console.error('Error creating member joined notification:', nerr);
    }

    return res.json({ message: 'Successfully joined farm', farm_id: farm.id, farm_name: farm.name, role: 'member' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) {}
    console.error('Error joining farm:', err);
    res.status(500).json({ message: 'Server error joining farm' });
  } finally {
    client.release();
  }
};

const getFarmMembers = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const userRes = await db.query('SELECT farm_id FROM users WHERE id = $1', [user_id]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const farm_id = userRes.rows[0].farm_id;
    if (!farm_id) return res.status(400).json({ message: 'User does not belong to a farm' });

    const membersRes = await db.query(
      'SELECT id, name, role FROM users WHERE farm_id = $1 ORDER BY id ASC',
      [farm_id]
    );

    res.json(membersRes.rows);
  } catch (err) {
    console.error('Error fetching farm members:', err);
    res.status(500).json({ message: 'Server error fetching members' });
  }
};

module.exports = { createFarm, getMyFarm, getMyFarms, switchFarm, joinFarm, getFarmMembers };
