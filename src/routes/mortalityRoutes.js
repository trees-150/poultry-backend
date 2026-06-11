const express = require('express');
const router = express.Router();

const {
  createMortality,
  getMortality
} = require('../controllers/mortalityController');

router.post('/', createMortality);
router.get('/', getMortality);

module.exports = router;
