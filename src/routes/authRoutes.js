const express = require('express');
const router = express.Router();
const { register, login, changePassword, forgotPassword, resetPassword, verifyPassword, verifyOtp } = require('../controllers/authController');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const forgotLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
});

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', auth, changePassword);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/verify-password', verifyPassword);

module.exports = router;
