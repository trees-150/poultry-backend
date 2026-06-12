const express = require('express');
const router = express.Router();
const { getFeedInventory, createFeedInventory, updateFeedInventory, deleteFeedInventory } = require('../controllers/feedInventoryController');

router.get('/', getFeedInventory);
router.post('/', createFeedInventory);
router.put('/:id', updateFeedInventory);
router.delete('/:id', deleteFeedInventory);

module.exports = router;
