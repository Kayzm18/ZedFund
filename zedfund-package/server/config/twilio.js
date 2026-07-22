require('dotenv').config();

module.exports = {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER, // your Twilio number, e.g. +1XXXXXXXXXX
};