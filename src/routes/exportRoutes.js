const express = require('express');
const router = express.Router();
const { exportFarmData } = require('../controllers/exportController');

router.get('/farm-data', exportFarmData);

module.exports = router;
