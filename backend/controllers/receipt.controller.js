const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const ImpactReceipt = require('../models/ImpactReceipt');
const { userCanViewTracking } = require('../utils/donationHelpers');
const {
  getReceiptViewForDonation,
  getReceiptPdfForDonation,
  buildReceiptView,
} = require('../services/digitalReceiptService');

const RECEIPT_POPULATE = [
  { path: 'donorId', select: 'username businessName role email contactNo' },
  { path: 'receiverId', select: 'username receiverName email contactNo role' },
  {
    path: 'driverId',
    select: 'username driverName email contactNo vehicleType vehicleNumber profileImage',
  },
];

async function loadDonationForReceipt(req, res, donationId) {
  if (!mongoose.Types.ObjectId.isValid(donationId)) {
    res.status(400).json({ success: false, message: 'Invalid donation id.' });
    return null;
  }

  const donation = await Donation.findById(donationId).populate(RECEIPT_POPULATE);
  if (!donation) {
    res.status(404).json({ success: false, message: 'Donation not found.' });
    return null;
  }

  if (!userCanViewTracking(donation, req.user._id)) {
    res.status(403).json({ success: false, message: 'Not allowed to view this receipt.' });
    return null;
  }

  if (donation.status !== 'delivered') {
    res.status(400).json({
      success: false,
      message: 'Digital receipt is available only after delivery.',
    });
    return null;
  }

  return donation;
}

exports.getReceiptView = async (req, res) => {
  try {
    const { id: donationId } = req.params;
    const donation = await loadDonationForReceipt(req, res, donationId);
    if (!donation) return;

    const view = await getReceiptViewForDonation(donationId);
    return res.json({
      success: true,
      ...view,
    });
  } catch (err) {
    console.error('getReceiptView error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to load receipt.',
    });
  }
};

exports.getReceiptDetails = async (req, res) => {
  try {
    const { id: donationId } = req.params;
    const donation = await loadDonationForReceipt(req, res, donationId);
    if (!donation) return;

    const receiverId =
      donation.receiverId?._id?.toString?.() || donation.receiverId?.toString?.();
    const viewerId = req.user._id.toString();

    if (receiverId !== viewerId) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can access receipt details.',
      });
    }

    const receipt = await ImpactReceipt.findOne({ donationId: donation._id });
    const view = buildReceiptView(donation, receipt);

    return res.json({
      success: true,
      receiptDetails: {
        ...view,
        distanceTraveled: view.receipt?.distanceTraveled ?? view.distanceTraveled ?? null,
        existingReceipt: view.receipt || null,
      },
    });
  } catch (err) {
    console.error('getReceiptDetails error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to load receipt details.',
    });
  }
};

exports.getReceiptPdf = async (req, res) => {
  try {
    const { id: donationId } = req.params;
    const donation = await loadDonationForReceipt(req, res, donationId);
    if (!donation) return;

    const { pdfBuffer, view } = await getReceiptPdfForDonation(donationId);
    const trackingId = view?.donation?.trackingId || donationId;
    const filename = `impact-receipt-${trackingId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('getReceiptPdf error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to generate PDF.',
    });
  }
};
