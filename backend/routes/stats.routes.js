const express = require('express');
const statsController = require('../controllers/stats.controller');

const router = express.Router();

router.get('/public', statsController.getPublicStats);

module.exports = router;
