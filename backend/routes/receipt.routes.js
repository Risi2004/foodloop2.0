const express = require('express');
const receiptController = require('../controllers/receipt.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/view', verifyJwt, receiptController.getReceiptView);
router.get('/details', verifyJwt, receiptController.getReceiptDetails);
router.get('/pdf', verifyJwt, receiptController.getReceiptPdf);

module.exports = router;
