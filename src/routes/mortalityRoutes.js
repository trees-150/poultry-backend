const express = require('express');
const router = express.Router();
const { createMortality, getMortality, updateMortality, deleteMortality } = require('../controllers/mortalityController');

router.post('/', createMortality);
router.get('/', getMortality);
router.put('/:id', updateMortality);
router.delete('/:id', deleteMortality);

module.exports = router;
