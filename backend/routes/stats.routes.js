const express = require('express');
const statsController = require('../controllers/stats.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.get('/public', statsController.getPublicStats);
router.get('/achievements', verifyJwt, statsController.getUserAchievements);

module.exports = router;

