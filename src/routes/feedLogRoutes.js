const express = require('express');
const router = express.Router();

const {
  createFeedLog,
  getFeedLogs
} = require('../controllers/feedLogController');

router.post('/', createFeedLog);
router.get('/', getFeedLogs);

module.exports = router;
