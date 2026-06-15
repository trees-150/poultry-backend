const express = require('express');
const router = express.Router();
const { getBackup, restoreBackup } = require('../controllers/backupController');

router.get('/farm', getBackup);
router.post('/restore', restoreBackup);

module.exports = router;
