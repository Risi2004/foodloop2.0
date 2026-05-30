const express = require('express');
const mapController = require('../controllers/map.controller');

const router = express.Router();

router.get('/locations', mapController.getPublicMapLocations);

module.exports = router;
