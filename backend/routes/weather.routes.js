const express = require('express');
const weatherController = require('../controllers/weather.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.get('/current', verifyJwt, weatherController.getCurrentWeather);
router.get('/forecast', verifyJwt, weatherController.getForecastWeather);

module.exports = router;
