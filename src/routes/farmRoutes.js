const express = require('express');
const router = express.Router();
const { createFarm } = require('../controllers/farmController');

// POST /api/farms/create
router.post('/create', createFarm);

module.exports = router;
