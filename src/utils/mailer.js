const nodemailer = require('nodemailer');
require('dotenv').config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('EMAIL_USER or EMAIL_PASS not set. sendOTPEmail will fail without credentials.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function sendOTPEmail(email, otp) {
  const subject = 'Poultry House Password Reset OTP';
  const text = `Your OTP is ${otp}. It expires in 10 minutes.`;

  const msg = {
    from: EMAIL_USER,
    to: email,
    subject,
    text,
  };

  return transporter.sendMail(msg);
}

module.exports = { sendOTPEmail };
