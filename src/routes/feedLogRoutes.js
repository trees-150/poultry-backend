const express = require('express');
const router = express.Router();
const { createFeedLog, updateFeedLog, deleteFeedLog, getFeedLogs } = require('../controllers/feedLogController');

router.post('/', createFeedLog);
router.put('/:id', updateFeedLog);
router.delete('/:id', deleteFeedLog);
router.get('/', getFeedLogs);

module.exports = router;
