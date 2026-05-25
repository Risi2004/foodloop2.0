const express = require('express');
const geocodeController = require('../controllers/geocode.controller');

const router = express.Router();

router.get('/search', geocodeController.search);
router.get('/reverse', geocodeController.reverse);

module.exports = router;
