const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const SALT_ROUNDS = 10;

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, hashed]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error registering user' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const result = await db.query('SELECT id, password FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user_id: user.id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error logging in' });
  }
};

const changePassword = async (req, res) => {
  try {
    const user_id = req.user && req.user.id;
    if (!user_id) return res.status(401).json({ message: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }

    // fetch user
    const result = await db.query('SELECT id, password FROM users WHERE id = $1', [user_id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ message: 'Incorrect current password' });

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user_id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error changing password' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    // find user
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      // Do not reveal whether user exists; return success for security
      return res.json({ message: 'If an account exists, password reset instructions will be sent.' });
    }

    const user = result.rows[0];

    // ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // In future: send email with token link. For now just return success.
    res.json({ message: 'If an account exists, password reset instructions will be sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error processing forgot password' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'token and newPassword are required' });

    // find token
    const tokenRes = await db.query('SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token = $1', [token]);
    if (tokenRes.rowCount === 0) return res.status(400).json({ message: 'Invalid or expired token' });

    const row = tokenRes.rows[0];
    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      // token expired
      await db.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]).catch(() => {});
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, row.user_id]);

    // consume token
    await db.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};

const verifyPassword = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const jwt = require('jsonwebtoken');

    let user = null;
    if (email) {
      const r = await db.query('SELECT id, password FROM users WHERE email = $1', [email]);
      if (r.rowCount === 0) return res.json({ valid: false });
      user = r.rows[0];
    } else if (req.headers && req.headers.authorization) {
      // attempt to parse bearer token
      const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const r = await db.query('SELECT id, password FROM users WHERE id = $1', [decoded.id]);
        if (r.rowCount === 0) return res.json({ valid: false });
        user = r.rows[0];
      } catch (e) {
        return res.json({ valid: false });
      }
    } else {
      return res.status(400).json({ message: 'email or Authorization token required' });
    }

    if (!password) return res.status(400).json({ message: 'password is required' });

    const ok = await bcrypt.compare(password, user.password);
    return res.json({ valid: !!ok });
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(500).json({ message: 'Server error verifying password' });
  }
};

module.exports = { register, login, changePassword, forgotPassword, resetPassword, verifyPassword };
