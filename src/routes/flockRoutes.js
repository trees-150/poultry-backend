const express = require("express");
const router = express.Router();
const { createFlock, getFlocks, updateFlock, deleteFlock, restoreFlock } = require("../controllers/flockController");

router.post("/", createFlock);
router.get("/", getFlocks);
router.put("/:id", updateFlock);
router.delete("/:id", deleteFlock);
router.post('/:id/restore', restoreFlock);

module.exports = router;
