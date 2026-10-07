import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_miksnmp_2026';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'admin' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      requiresPasswordChange: Boolean(user.requires_password_change),
      user: { id: user.id, username: user.username, role: user.role || 'admin' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/change-password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ?, requires_password_change = false WHERE id = ?', [newHash, user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to protect routes (optional to export if we want to use it in index.js)
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Portal Users Management ---

// Get all users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, username, role, requires_password_change FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new user
router.post('/users', async (req, res) => {
  const { name, username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return res.status(400).json({ error: 'Username already exists' });
    
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, username, password_hash, role, requires_password_change) VALUES (?, ?, ?, ?, false)',
      [name || '', username, hash, role || 'readonly']
    );
    res.json({ id: result.insertId, name, username, role: role || 'readonly' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a user (Name, Username, Password, Role optional)
router.put('/users/:id', async (req, res) => {
  const { name, username, password, role } = req.body;
  const { id } = req.params;
  try {
    // Check if another user has this username
    if (username) {
       const [existing] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
       if (existing.length > 0) return res.status(400).json({ error: 'Username already exists' });
    }
    
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET name = ?, username = ?, password_hash = ?, role = ? WHERE id = ?', [name || '', username, hash, role || 'readonly', id]);
    } else {
      await pool.query('UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?', [name || '', username, role || 'readonly', id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    // Prevent deleting all users (ensure at least 1 remains or just delete)
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
