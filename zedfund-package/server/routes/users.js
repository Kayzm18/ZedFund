const express = require('express');
const { readDB, writeDB, genId } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const PROVIDER_NAMES = { mtn: 'MTN Mobile Money', airtel: 'Airtel Money', zamtel: 'Zamtel Kwacha' };

router.get('/dashboard', requireAuth, (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.role === 'organizer' || user.role === 'admin') {
    const myCampaigns = db.campaigns.filter((c) => c.organizerId === user.id);
    const totalRaised = myCampaigns.reduce((sum, c) => sum + c.raised, 0);
    const totalWithdrawn = db.withdrawals
      .filter((w) => w.userId === user.id && w.status === 'success')
      .reduce((sum, w) => sum + w.amount, 0);
    const available = Math.max(totalRaised - totalWithdrawn, 0);
    const transactions = db.withdrawals
      .filter((w) => w.userId === user.id)
      .map((w) => ({ ...w, providerName: PROVIDER_NAMES[w.provider] || w.provider, kind: 'withdrawal' }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      role: user.role,
      stats: { totalRaised, available, activeCampaigns: myCampaigns.filter((c) => c.status === 'verified').length },
      campaigns: myCampaigns,
      transactions,
      momoProvider: user.momoProvider,
      momoNumber: user.momoNumber
    });
  }

  // donor view
  const myDonations = db.donations
    .filter((d) => d.donorId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalDonated = myDonations.filter((d) => d.status === 'success').reduce((s, d) => s + d.amount, 0);
  const campaignsSupported = new Set(myDonations.filter((d) => d.status === 'success').map((d) => d.campaignId));
  const transactions = myDonations.map((d) => {
    const campaign = db.campaigns.find((c) => c.id === d.campaignId);
    return { ...d, providerName: PROVIDER_NAMES[d.provider] || d.provider, campaignTitle: campaign ? campaign.title : 'Unknown campaign', kind: 'donation' };
  });

  res.json({
    role: user.role,
    stats: { totalDonated, activeCampaigns: campaignsSupported.size },
    transactions,
    momoProvider: user.momoProvider,
    momoNumber: user.momoNumber
  });
});

router.post('/withdraw', requireAuth, (req, res) => {
  const { amount, provider, phone } = req.body || {};
  if (!amount || !provider || !phone) {
    return res.status(400).json({ error: 'Amount, provider, and phone number are required.' });
  }
  if (!PROVIDER_NAMES[provider]) return res.status(400).json({ error: 'Unsupported provider.' });

  const db = readDB();
  const myCampaigns = db.campaigns.filter((c) => c.organizerId === req.user.id);
  const totalRaised = myCampaigns.reduce((sum, c) => sum + c.raised, 0);
  const totalWithdrawn = db.withdrawals
    .filter((w) => w.userId === req.user.id && w.status === 'success')
    .reduce((sum, w) => sum + w.amount, 0);
  const available = totalRaised - totalWithdrawn;

  if (Number(amount) > available) {
    return res.status(400).json({ error: `You can only withdraw up to your available balance of ZMW ${available.toLocaleString()}.` });
  }

  const withdrawal = {
    id: genId('w'),
    userId: req.user.id,
    amount: Number(amount),
    provider,
    status: 'success',
    createdAt: new Date().toISOString()
  };
  db.withdrawals.push(withdrawal);
  writeDB(db);

  res.status(201).json({
    withdrawal,
    message: `ZMW ${Number(amount).toLocaleString()} has been sent to your ${PROVIDER_NAMES[provider]} account.`
  });
});

module.exports = router;
