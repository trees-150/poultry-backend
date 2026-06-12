const express = require('express');
const router = express.Router();
const { createVaccination, getVaccinations, updateVaccination, deleteVaccination } = require('../controllers/vaccinationController');

router.post('/', createVaccination);
router.get('/', getVaccinations);
router.put('/:id', updateVaccination);
router.delete('/:id', deleteVaccination);

module.exports = router;
