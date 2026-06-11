const express = require("express");
const router = express.Router();

const {
  getFeedInventory,
  createFeedInventory
} = require("../controllers/feedInventoryController");

router.get("/", getFeedInventory);
router.post("/", createFeedInventory);

module.exports = router;

