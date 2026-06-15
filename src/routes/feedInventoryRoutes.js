const express = require('express');
const router = express.Router();
const { getFeedInventory, createFeedInventory, updateFeedInventory, deleteFeedInventory, restoreFeedInventory } = require('../controllers/feedInventoryController');

router.get('/', getFeedInventory);
router.post('/', createFeedInventory);
router.put('/:id', updateFeedInventory);
router.delete('/:id', deleteFeedInventory);
router.post('/:id/restore', restoreFeedInventory);

module.exports = router;
