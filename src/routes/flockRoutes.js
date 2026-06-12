const express = require("express");
const router = express.Router();
const { createFlock, getFlocks, updateFlock, deleteFlock } = require("../controllers/flockController");

router.post("/", createFlock);
router.get("/", getFlocks);
router.put("/:id", updateFlock);
router.delete("/:id", deleteFlock);

module.exports = router;
