const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, updateExpense, deleteExpense, restoreExpense } = require('../controllers/expenseController');

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);
router.post('/:id/restore', restoreExpense);

module.exports = router;
