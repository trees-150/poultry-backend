const express = require('express');
const router = express.Router();

const {
  createVaccination,
  getVaccinations
} = require('../controllers/vaccinationController');

router.post('/', createVaccination);
router.get('/', getVaccinations);

module.exports = router;
