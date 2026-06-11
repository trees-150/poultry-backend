const express = require('express');
const router = express.Router();
const { addAnimal, getAnimals } = require('../controllers/animalController');

// Define routes
router.post('/', addAnimal);
router.get('/', getAnimals);

module.exports = router;