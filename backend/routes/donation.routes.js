const express = require('express');
const donationController = require('../controllers/donation.controller');
const { verifyJwt } = require('../middleware/auth');
const { donationImageUpload } = require('../middleware/upload');

const router = express.Router();

router.post(
  '/analyze-image',
  verifyJwt,
  (req, res, next) => {
    donationImageUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed',
        });
      }
      next();
    });
  },
  donationController.analyzeImage
);

router.post('/', verifyJwt, donationController.createDonation);
router.get('/mine', verifyJwt, donationController.getMyDonations);
router.get('/available', verifyJwt, donationController.getAvailableDonations);
router.get('/my-claims', verifyJwt, donationController.getMyClaims);
router.post('/:id/claim', verifyJwt, donationController.claimDonation);
router.post('/:id/cancel-claim', verifyJwt, donationController.cancelClaim);
router.post('/:id/discount-suggestion', verifyJwt, donationController.getDiscountSuggestion);
router.patch('/:id/apply-discount', verifyJwt, donationController.applyDiscountSuggestion);
router.get('/:id/delivery-quote', verifyJwt, donationController.getDeliveryQuote);
router.get('/:id', verifyJwt, donationController.getDonationById);
router.patch('/:id', verifyJwt, donationController.updateDonation);
router.delete('/:id', verifyJwt, donationController.deleteDonation);

module.exports = router;
