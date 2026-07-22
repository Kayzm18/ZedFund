const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db');
const twilio = require('twilio');

// Twilio sends form-encoded data, not JSON
router.post('/sms', express.urlencoded({ extended: false }), (req, res) => {
    const body = (req.body.Body || '').trim().toUpperCase(); // e.g. "YES AB12CD"

    const db = readDB();
    const donation = db.donations.find(
        (d) => d.status === 'pending' && d.smsRef && body.includes(d.smsRef)
    );

    const twiml = new twilio.twiml.MessagingResponse();

    if (!donation) {
        twiml.message("Sorry, we couldn't find a matching pending donation for that reference.");
    } else if (body.startsWith('YES')) {
        donation.status = 'success';
        const campaign = db.campaigns.find((c) => c.id === donation.campaignId);
        if (campaign) campaign.raised = (campaign.raised || 0) + donation.amount;
        writeDB(db);
        twiml.message(`Thank you! Your K${donation.amount} donation was confirmed.`);
    } else if (body.startsWith('NO')) {
        donation.status = 'failed';
        writeDB(db);
        twiml.message('Donation cancelled.');
    } else {
        twiml.message(`Reply YES ${donation.smsRef} to confirm or NO ${donation.smsRef} to decline.`);
    }

    res.type('text/xml').send(twiml.toString());
});

module.exports = router;