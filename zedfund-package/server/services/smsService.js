const twilio = require('twilio');
const config = require('../config/twilio');

const client = twilio(config.accountSid, config.authToken);

// donation.id is long (e.g. "d-abc123-xy9z2f") — use a short readable ref for SMS
function shortRef(donationId) {
    return donationId.slice(-6).toUpperCase();
}

async function sendPaymentRequest({ toPhoneE164, amount, campaignName, donationId }) {
    const ref = shortRef(donationId);

    const message = await client.messages.create({
        to: toPhoneE164,        // must be E.164, e.g. "+260977123456", and must be a Twilio-verified number in trial mode
        from: config.fromNumber,
        body: `ZedFund: Approve K${amount} donation to "${campaignName}"? Reply YES ${ref} to confirm or NO ${ref} to decline.`,
    });

    return { sid: message.sid, ref };
}

module.exports = { sendPaymentRequest, shortRef };