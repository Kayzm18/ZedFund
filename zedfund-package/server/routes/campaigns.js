const express = require('express');
const { readDB, writeDB, genId } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/campaigns?category=Health&province=Lusaka&sort=trending&search=water
router.get('/', (req, res) => {
  const db = readDB();
  let campaigns = db.campaigns.filter((c) => c.status === 'verified');

  const { category, province, search, sort, minGoal, maxGoal } = req.query;

  if (category && category !== 'All') {
    campaigns = campaigns.filter((c) => c.category === category);
  }
  if (province && province !== 'All') {
    campaigns = campaigns.filter((c) => c.province === province);
  }
  if (search) {
    const q = search.toLowerCase();
    campaigns = campaigns.filter(
      (c) => c.title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q)
    );
  }
  if (minGoal) campaigns = campaigns.filter((c) => c.goal >= Number(minGoal));
  if (maxGoal) campaigns = campaigns.filter((c) => c.goal <= Number(maxGoal));

  if (sort === 'newest') {
    campaigns = [...campaigns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'ending-soon') {
    campaigns = [...campaigns].sort((a, b) => a.deadlineDays - b.deadlineDays);
  } else if (sort === 'most-funded') {
    campaigns = [...campaigns].sort((a, b) => b.raised / b.goal - a.raised / a.goal);
  } else {
    // trending: closest to fully funded with time pressure
    campaigns = [...campaigns].sort(
      (a, b) => b.raised / b.goal / (b.deadlineDays + 1) - a.raised / a.goal / (a.deadlineDays + 1)
    );
  }

  res.json({ campaigns, total: campaigns.length });
});

router.get('/categories', (req, res) => {
  const db = readDB();
  const categories = [...new Set(db.campaigns.map((c) => c.category))];
  const provinces = [...new Set(db.campaigns.map((c) => c.province))];
  res.json({ categories, provinces });
});

router.get('/mine', requireAuth, (req, res) => {
  const db = readDB();
  const campaigns = db.campaigns.filter((c) => c.organizerId === req.user.id);
  res.json({ campaigns });
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const campaign = db.campaigns.find((c) => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  const donations = db.donations
    .filter((d) => d.campaignId === campaign.id && d.status === 'success')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ campaign, donations, donorCount: donations.length });
});

router.post('/', requireAuth, (req, res) => {
  const { title, category, province, summary, mission, goal, image, deadlineDays } = req.body || {};
  if (!title || !category || !province || !summary || !mission || !goal) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }
  if (Number(goal) <= 0) {
    return res.status(400).json({ error: 'Goal amount must be greater than zero.' });
  }
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user.id);
  const campaign = {
    id: genId('c'),
    title,
    category,
    province,
    organizerId: req.user.id,
    organizerName: user ? user.name : req.user.name,
    verifiedOrganizer: false,
    image: image || 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200',
    summary,
    mission,
    quote: '',
    goal: Number(goal),
    raised: 0,
    status: 'pending',
    deadlineDays: deadlineDays ? Number(deadlineDays) : 30,
    documents: [],
    updates: [],
    createdAt: new Date().toISOString()
  };
  db.campaigns.push(campaign);
  writeDB(db);
  res.status(201).json({ campaign });
});

router.post('/:id/updates', requireAuth, (req, res) => {
  const { title, body } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Update title and body are required.' });
  const db = readDB();
  const campaign = db.campaigns.find((c) => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  if (campaign.organizerId !== req.user.id) {
    return res.status(403).json({ error: 'Only the campaign organizer can post updates.' });
  }
  campaign.updates.unshift({ date: new Date().toISOString().slice(0, 10), title, body });
  writeDB(db);
  res.status(201).json({ campaign });
});

module.exports = router;
