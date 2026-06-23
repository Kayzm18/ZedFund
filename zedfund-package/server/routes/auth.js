const express = require('express');
const bcrypt = require('bcryptjs');
const { readDB, writeDB, genId } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    momoProvider: u.momoProvider,
    momoNumber: u.momoNumber,
    walletBalance: u.walletBalance
  };
}

router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are all required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const db = readDB();
  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const user = {
    id: genId('u'),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: role === 'organizer' ? 'organizer' : 'donor',
    momoProvider: null,
    momoNumber: null,
    walletBalance: 0,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDB(db);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});

router.put('/momo', requireAuth, (req, res) => {
  const { momoProvider, momoNumber } = req.body || {};
  if (!momoProvider || !momoNumber) {
    return res.status(400).json({ error: 'Provider and phone number are required.' });
  }
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.momoProvider = momoProvider;
  user.momoNumber = momoNumber;
  writeDB(db);
  res.json({ user: publicUser(user) });
});

module.exports = router;
