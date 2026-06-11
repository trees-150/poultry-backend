const express = require('express');
const router = express.Router();

const { createReplacement, getReplacements } = require('../controllers/replacementController');

router.post('/', createReplacement);
router.get('/', getReplacements);

module.exports = router;
