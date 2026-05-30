const express = require('express');
const reviewController = require('../controllers/review.controller');
const { verifyJwt } = require('../middleware/auth');

const router = express.Router();

router.get('/approved', reviewController.getApprovedReviews);
router.post('/', verifyJwt, reviewController.submitReview);

module.exports = router;
