const express = require('express');
const maintenanceController = require('../controllers/maintenance.controller');

const router = express.Router();

router.get('/status', maintenanceController.getPublicStatus);

module.exports = router;
