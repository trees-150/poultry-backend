const express = require('express');
const router = express.Router();
const { addEggRecord, getEggRecords } = require('../controllers/eggController');

// Define routes
router.post('/', addEggRecord);
router.get('/', getEggRecords);

module.exports = router;