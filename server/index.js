import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
let db;
const initializeDb = async () => {
  db = await open({
    filename: join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      credit_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Initialize database
initializeDb().catch(console.error);

// Verify hCaptcha token
async function verifyHCaptcha(token) {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  const response = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `response=${token}&secret=${secret}`
  });
  const data = await response.json();
  return data.success;
}

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, username, password, captchaToken } = req.body;

    // Verify hCaptcha
    const isValidCaptcha = await verifyHCaptcha(captchaToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'Invalid captcha' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db.run(
      'INSERT INTO users (username, email, password, credit_balance) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 0]
    );

    const user = await db.get('SELECT id, username, email, credit_balance FROM users WHERE username = ?', [username]);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ message: 'Username or email already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, captchaToken } = req.body;

    // Verify hCaptcha
    const isValidCaptcha = await verifyHCaptcha(captchaToken);
    if (!isValidCaptcha) {
      return res.status(400).json({ message: 'Invalid captcha' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected routes middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Credits routes
app.post('/api/credits/add', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    await db.run(
      'UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?',
      [amount, req.user.userId]
    );
    const user = await db.get('SELECT id, username, email, credit_balance FROM users WHERE id = ?', [req.user.userId]);
    res.json({ success: true, newBalance: user.credit_balance });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add credits' });
  }
});

app.post('/api/credits/deduct', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await db.get('SELECT credit_balance FROM users WHERE id = ?', [req.user.userId]);
    
    if (user.credit_balance < amount) {
      return res.status(400).json({ message: 'Insufficient credits' });
    }

    await db.run(
      'UPDATE users SET credit_balance = credit_balance - ? WHERE id = ?',
      [amount, req.user.userId]
    );

    const updatedUser = await db.get('SELECT id, username, email, credit_balance FROM users WHERE id = ?', [req.user.userId]);
    res.json({ success: true, newBalance: updatedUser.credit_balance });
  } catch (error) {
    res.status(500).json({ message: 'Failed to deduct credits' });
  }
});

app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, email, credit_balance FROM users WHERE id = ?', [req.user.userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});