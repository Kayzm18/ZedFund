const express = require('express');
const { readDB, writeDB } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', (req, res) => {
  const db = readDB();
  const platformVolume = db.campaigns.reduce((sum, c) => sum + c.raised, 0);
  const pendingVerifications = db.campaigns.filter((c) => c.status === 'pending').length;

  res.json({
    platformVolume,
    dailyActiveUsers: 1842,
    pendingVerifications,
    fraudFlags: 2
  });
});

router.get('/pending', (req, res) => {
  const db = readDB();
  const pending = db.campaigns.filter((c) => c.status === 'pending');
  res.json({ campaigns: pending });
});

router.get('/campaigns', (req, res) => {
  const db = readDB();
  res.json({ campaigns: db.campaigns });
});

router.post('/campaigns/:id/verify', (req, res) => {
  const db = readDB();
  const campaign = db.campaigns.find((c) => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  campaign.status = 'verified';
  writeDB(db);
  res.json({ campaign });
});

router.post('/campaigns/:id/reject', (req, res) => {
  const db = readDB();
  const campaign = db.campaigns.find((c) => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  campaign.status = 'rejected';
  writeDB(db);
  res.json({ campaign });
});

module.exports = router;
