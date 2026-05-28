const express = require('express');
const customerOrderController = require('../controllers/customerOrder.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJwt);
router.get('/mine', customerOrderController.getMyCustomerOrders);
router.get('/:orderId/tracking', customerOrderController.getCustomerOrderTracking);

module.exports = router;
