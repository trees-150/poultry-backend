const express = require('express');
const router = express.Router();
const { createMortality, getMortality, updateMortality, deleteMortality, restoreMortality } = require('../controllers/mortalityController');

router.post('/', createMortality);
router.get('/', getMortality);
router.put('/:id', updateMortality);
router.delete('/:id', deleteMortality);
router.post('/:id/restore', restoreMortality);

module.exports = router;
