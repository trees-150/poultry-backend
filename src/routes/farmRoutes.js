const express = require('express');
const router = express.Router();
const { createFarm, getMyFarm } = require('../controllers/farmController');

// POST /api/farms/create
router.post('/create', createFarm);

// GET /api/farms/my-farm
router.get('/my-farm', getMyFarm);

// POST /api/farms/join
router.post('/join', require('../controllers/farmController').joinFarm);

// GET /api/farms/members
router.get('/members', require('../controllers/farmController').getFarmMembers);

module.exports = router;
