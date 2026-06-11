const express = require("express");
const router = express.Router();

const {
  createFlock,
  getFlocks
} = require("../controllers/flockController");

router.post("/", createFlock);
router.get("/", getFlocks);

module.exports = router;