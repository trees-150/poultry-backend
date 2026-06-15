const express = require("express");
const router = express.Router();
const { getSales, createSale, updateSale, deleteSale, restoreSale } = require("../controllers/salesController");

router.get("/", getSales);
router.post("/", createSale);
router.put("/:id", updateSale);
router.delete("/:id", deleteSale);
router.post('/:id/restore', restoreSale);

module.exports = router;
