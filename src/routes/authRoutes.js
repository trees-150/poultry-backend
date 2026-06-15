const express = require('express');
const router = express.Router();
const { register, login, changePassword, forgotPassword, resetPassword, verifyPassword } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', auth, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-password', verifyPassword);

module.exports = router;
