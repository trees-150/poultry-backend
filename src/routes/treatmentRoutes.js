const express = require('express');
const router = express.Router();
const { createTreatment, getTreatments, updateTreatment, deleteTreatment } = require('../controllers/treatmentController');

router.post('/', createTreatment);
router.get('/', getTreatments);
router.put('/:id', updateTreatment);
router.delete('/:id', deleteTreatment);

module.exports = router;
