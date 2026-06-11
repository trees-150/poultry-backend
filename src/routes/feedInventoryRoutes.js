const express = require("express");
const router = express.Router();

const {
  getFeedInventory,
  createFeedInventory
} = require("../controllers/feedInventoryController");

router.get("/", getFeedInventory);
router.post("/", createFeedInventory);

module.exports = router;
const express = require('express');
const router = express.Router();

const {
  createFeed,
  getFeed
} = require('../controllers/feedInventoryController');

router.post('/', createFeed);
router.get('/', getFeed);

module.exports = router;
