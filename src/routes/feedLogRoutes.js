const express = require('express');
const router = express.Router();
const { createFeedLog, updateFeedLog, deleteFeedLog, getFeedLogs, restoreFeedLog } = require('../controllers/feedLogController');

router.post('/', createFeedLog);
router.put('/:id', updateFeedLog);
router.delete('/:id', deleteFeedLog);
router.get('/', getFeedLogs);
router.post('/:id/restore', restoreFeedLog);

module.exports = router;
