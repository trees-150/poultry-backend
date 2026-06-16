const express = require('express');
const router = express.Router();
const { createFarm, getMyFarm, getMyFarms, switchFarm } = require('../controllers/farmController');

// POST /api/farms/create
router.post('/create', createFarm);

// GET /api/farms/my-farm
router.get('/my-farm', getMyFarm);

// GET /api/farms/my-farms
router.get('/my-farms', getMyFarms);

// POST /api/farms/join
router.post('/join', require('../controllers/farmController').joinFarm);

// POST /api/farms/switch
router.post('/switch', switchFarm);

// GET /api/farms/members
router.get('/members', require('../controllers/farmController').getFarmMembers);

module.exports = router;
