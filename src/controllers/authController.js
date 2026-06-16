const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOTPEmail } = require('../utils/mailer');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || (process.env.JWT_SECRET || 'change_this_secret');
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

    // find user; do not reveal existence to caller
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      // Respond generically even if user doesn't exist
      return res.json({ message: 'If an account exists, an OTP has been sent.' });
    }

    // ensure password_resets table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // insert OTP record
    await db.query(
      'INSERT INTO password_resets (email, otp_hash, expires_at) VALUES ($1, $2, $3)',
      [email, otpHash, expiresAt]
    );

    // send email asynchronously; do not await to keep response fast, but catch errors
    sendOTPEmail(email, otp).catch((err) => {
      console.error('Error sending OTP email:', err && err.message ? err.message : err);
    });

    res.json({ message: 'If an account exists, an OTP has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error processing forgot password' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ message: 'email and otp are required' });

    // find latest non-used OTP for email
    const r = await db.query(
      `SELECT id, otp_hash, expires_at, used FROM password_resets WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    if (r.rowCount === 0) return res.status(400).json({ message: 'Invalid OTP' });

    const row = r.rows[0];
    if (row.used) return res.status(400).json({ message: 'Invalid OTP' });
    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) return res.status(400).json({ message: 'Invalid OTP' });

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== row.otp_hash) return res.status(400).json({ message: 'Invalid OTP' });

    // mark used
    await db.query('UPDATE password_resets SET used = true WHERE id = $1', [row.id]);

    // issue short-lived reset token
    const resetToken = jwt.sign({ email }, JWT_RESET_SECRET, { expiresIn: '15m' });

    res.json({ reset_token: resetToken });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { reset_token, new_password } = req.body || {};
    if (!reset_token || !new_password) return res.status(400).json({ message: 'reset_token and new_password are required' });

    // validate token
    let payload;
    try {
      payload = jwt.verify(reset_token, JWT_RESET_SECRET);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const email = payload.email;
    if (!email) return res.status(400).json({ message: 'Invalid reset token' });

    // find user
    const u = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (u.rowCount === 0) return res.status(400).json({ message: 'Invalid reset token' });

    const user = u.rows[0];

    const hashed = await bcrypt.hash(new_password, SALT_ROUNDS);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);

    // mark all OTPs for this email used
    await db.query('UPDATE password_resets SET used = true WHERE email = $1', [email]);

    res.json({ message: 'Password reset successful' });
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
