const express = require('express');
const contactController = require('../controllers/contact.controller');
const { contactRateLimit } = require('../middleware/contactRateLimit');

const router = express.Router();

router.post('/', contactRateLimit, contactController.submitContact);

module.exports = router;
