const express = require('express');
const { readDB, writeDB, genId } = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const PROVIDER_NAMES = { mtn: 'MTN Mobile Money', airtel: 'Airtel Money', zamtel: 'Zamtel Kwacha' };

function maskPhone(phone) {
  return phone.slice(0, 4) + '*'.repeat(Math.max(phone.length - 4, 0));
}

// Step 1: initiate a donation -> creates a "pending" record simulating a push to the phone
router.post('/initiate', optionalAuth, (req, res) => {
  const { campaignId, amount, provider, phone, donorName, anonymous } = req.body || {};

  if (!campaignId || !amount || !provider || !phone) {
    return res.status(400).json({ error: 'Campaign, amount, provider, and phone number are all required.' });
  }
  if (!PROVIDER_NAMES[provider]) {
    return res.status(400).json({ error: 'Unsupported mobile money provider.' });
  }
  if (Number(amount) < 5) {
    return res.status(400).json({ error: 'Minimum donation is K5.' });
  }
  if (!/^0[79]\d{8}$/.test(phone)) {
    return res.status(400).json({ error: 'Enter a valid Zambian mobile number, e.g. 0977123456.' });
  }

  const db = readDB();
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

  const donation = {
    id: genId('d'),
    campaignId,
    donorId: req.user ? req.user.id : null,
    donorName: anonymous ? 'Anonymous' : donorName || (req.user ? req.user.name : 'Anonymous'),
    amount: Number(amount),
    provider,
    phone: maskPhone(phone),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.donations.push(donation);
  writeDB(db);

  res.status(201).json({
    donationId: donation.id,
    providerName: PROVIDER_NAMES[provider],
    message: `A payment request for K${Number(amount).toLocaleString()} has been sent to ${maskPhone(phone)} via ${PROVIDER_NAMES[provider]}. Enter your PIN on your phone to approve.`
  });
});

// Step 2: confirm the donation -> simulates the user approving the USSD prompt on their phone
router.post('/:id/confirm', (req, res) => {
  const db = readDB();
  const donation = db.donations.find((d) => d.id === req.params.id);
  if (!donation) return res.status(404).json({ error: 'Donation not found.' });
  if (donation.status !== 'pending') {
    return res.json({ donation });
  }

  // Simulated network: ~92% approval rate, mirrors a real mobile money push success rate
  const approved = Math.random() < 0.92;
  donation.status = approved ? 'success' : 'failed';

  if (approved) {
    const campaign = db.campaigns.find((c) => c.id === donation.campaignId);
    if (campaign) campaign.raised += donation.amount;
  }

  writeDB(db);
  res.json({ donation });
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const donation = db.donations.find((d) => d.id === req.params.id);
  if (!donation) return res.status(404).json({ error: 'Donation not found.' });
  res.json({ donation });
});

module.exports = router;
