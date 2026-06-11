const express = require('express');
const router = express.Router();

const {
  createFeed,
  getFeed
} = require('../controllers/feedInventoryController');

router.post('/', createFeed);
router.get('/', getFeed);

module.exports = router;
