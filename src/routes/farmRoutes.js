const express = require('express');
const router = express.Router();
const { createFarm, getMyFarm } = require('../controllers/farmController');

// POST /api/farms/create
router.post('/create', createFarm);

// GET /api/farms/my-farm
router.get('/my-farm', getMyFarm);

module.exports = router;
