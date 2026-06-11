const express = require('express');
const router = express.Router();

const {
  createTreatment,
  getTreatments
} = require('../controllers/treatmentController');

router.post('/', createTreatment);
router.get('/', getTreatments);

module.exports = router;
