const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');
const { isReceiverRole } = require('../utils/donationHelpers');
const { sendPaymentInvoiceEmail } = require('../utils/sendNotificationEmail');

const CHECKOUT_TTL_MS = 30 * 60 * 1000;

function requireReceiver(req, res) {
  if (!isReceiverRole(req.user.role)) {
    res.status(403).json({ success: false, message: 'Only receivers can pay for listings.' });
    return false;
  }
  return true;
}

function generateOrderId(donationId) {
  const suffix = Date.now().toString(36).toUpperCase();
  const idPart = donationId.toString().slice(-8).toUpperCase().replace(/\W/g, '');
  return `FL${idPart}${suffix}`.slice(0, 32);
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function validateMockCard({ cardNumber, expiry, cvv }) {
  const num = digitsOnly(cardNumber);
  if (num.length < 16) {
    return { ok: false, message: 'Card number must be at least 16 digits.' };
  }
  const expiryTrimmed = String(expiry || '').trim();
  if (!/^\d{2}\/\d{2}$/.test(expiryTrimmed)) {
    return { ok: false, message: 'Expiry must be MM/YY.' };
  }
  const cvvDigits = digitsOnly(cvv);
  if (cvvDigits.length !== 3) {
    return { ok: false, message: 'CVV must be 3 digits.' };
  }
  return { ok: true, cardLast4: num.slice(-4) };
}

async function loadSellDonation(donationId) {
  if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
    return { error: { status: 400, message: 'Invalid donation id.' } };
  }
  const donation = await Donation.findById(donationId);
  if (!donation) {
    return { error: { status: 404, message: 'Donation not found.' } };
  }
  if (donation.status !== 'available') {
    return { error: { status: 400, message: 'This listing is no longer available.' } };
  }
  if (donation.listingType !== 'sell' || !donation.priceAmount || donation.priceAmount <= 0) {
    return { error: { status: 400, message: 'Payment is only required for cash listings.' } };
  }
  return { donation };
}

exports.createClaimCheckout = async (req, res) => {
  try {
    if (!requireReceiver(req, res)) return;

    const { donationId } = req.body || {};
    const loaded = await loadSellDonation(donationId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const { donation } = loaded;
    const receiverId = req.user._id;

    const blocking = await Payment.findOne({
      donationId: donation._id,
      status: { $in: ['paid', 'consumed'] },
      receiverId: { $ne: receiverId },
    });
    if (blocking) {
      return res.status(409).json({
        success: false,
        message: 'Another receiver has already paid for this listing.',
      });
    }

    const existingPaid = await Payment.findOne({
      donationId: donation._id,
      receiverId,
      status: 'paid',
      expiresAt: { $gt: new Date() },
    });
    if (existingPaid) {
      return res.json({
        success: true,
        orderId: existingPaid.orderId,
        amount: existingPaid.amount,
        currency: existingPaid.currency || 'LKR',
        itemName: donation.itemName || 'Food listing',
        reused: true,
      });
    }

    await Payment.updateMany(
      {
        donationId: donation._id,
        receiverId,
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'cancelled' } }
    );

    const orderId = generateOrderId(donation._id);
    const amount = donation.priceAmount;
    const currency = donation.priceCurrency || 'LKR';

    await Payment.create({
      orderId,
      donationId: donation._id,
      receiverId,
      amount,
      currency,
      status: 'pending',
      expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
    });

    return res.json({
      success: true,
      orderId,
      amount,
      currency,
      itemName: donation.itemName || 'Food listing',
      reused: false,
    });
  } catch (err) {
    console.error('createClaimCheckout error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to start payment',
    });
  }
};

exports.confirmClaimPayment = async (req, res) => {
  try {
    if (!requireReceiver(req, res)) return;

    const { orderId, cardNumber, expiry, cvv, cardLast4: bodyLast4 } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order id required.' });
    }

    const cardCheck = validateMockCard({ cardNumber, expiry, cvv });
    if (!cardCheck.ok) {
      return res.status(400).json({ success: false, message: cardCheck.message });
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }
    if (payment.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your payment.' });
    }
    if (payment.status === 'paid' || payment.status === 'consumed') {
      return res.json({
        success: true,
        status: payment.status,
        orderId: payment.orderId,
        donationId: payment.donationId.toString(),
      });
    }
    if (payment.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Payment is not pending.' });
    }
    if (payment.expiresAt < new Date()) {
      payment.status = 'cancelled';
      await payment.save();
      return res.status(400).json({
        success: false,
        message: 'Payment session expired. Please start checkout again.',
      });
    }

    const last4 =
      bodyLast4 && String(bodyLast4).replace(/\D/g, '').slice(-4).length === 4
        ? String(bodyLast4).replace(/\D/g, '').slice(-4)
        : cardCheck.cardLast4;

    payment.status = 'paid';
    payment.cardLast4 = last4;
    await payment.save();

    const donation = await Donation.findById(payment.donationId);
    sendPaymentInvoiceEmail(req.user, { payment, donation }).catch(() => {});

    return res.json({
      success: true,
      status: 'paid',
      orderId: payment.orderId,
      donationId: payment.donationId.toString(),
    });
  } catch (err) {
    console.error('confirmClaimPayment error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to confirm payment',
    });
  }
};

/**
 * Verify paid payment for claim; marks consumed on success.
 */
async function verifyPaidPaymentForClaim({ paymentOrderId, donationId, receiverId }) {
  const payment = await Payment.findOne({
    orderId: paymentOrderId,
    donationId,
    receiverId,
  });

  if (!payment) {
    return { ok: false, message: 'Payment not found for this order.' };
  }
  if (payment.status === 'consumed') {
    return { ok: false, message: 'This payment was already used for a claim.' };
  }
  if (payment.status !== 'paid') {
    return {
      ok: false,
      message: 'Complete payment before claiming this listing.',
    };
  }
  if (payment.expiresAt < new Date()) {
    return {
      ok: false,
      message: 'Payment session expired. Please pay again.',
    };
  }

  payment.status = 'consumed';
  payment.consumedAt = new Date();
  await payment.save();

  return { ok: true, payment };
}

exports.verifyPaidPaymentForClaim = verifyPaidPaymentForClaim;
