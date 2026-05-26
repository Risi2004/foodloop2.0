const express = require('express');
const routingController = require('../controllers/routing.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.get('/route', verifyJwt, routingController.getRoute);
router.post('/table', verifyJwt, routingController.getTable);

module.exports = router;
