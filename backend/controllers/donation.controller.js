const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const { analyzeFoodImage, FoodVisionError } = require('../services/geminiFoodVision');
const { generateDiscountSuggestion } = require('../services/geminiDiscountEngine');
const {
  getCurrentWeatherByCoords,
  getForecastWeatherByCoords,
} = require('../services/weatherService');
const { uploadDonationImage } = require('../utils/r2Storage');
const {
  sendDonationPostedEmail,
  sendNewDonationToAllReceivers,
  sendAiPriceReductionToReceiversAndCustomers,
} = require('../utils/sendNotificationEmail');
const {
  MAX_RECEIVER_RADIUS_KM,
  calculateDistanceKm,
  isDonationExpired,
} = require('../utils/distance');
const {
  getDonorDisplayName,
  isReceiverRole,
  isWithinSriLanka,
  toAvailableDonationJSON,
  toClaimJSON,
  enrichClaimFromParent,
  indexChildClaimsByParent,
  enrichParentListingForDonor,
} = require('../utils/donationHelpers');
const { buildReceiverDeliveryQuoteForDonation } = require('../utils/receiverDeliveryQuote');
const { emitToReceivers, emitToDonor, emitToDrivers } = require('../socket');
const {
  sendDonationClaimedEmails,
  sendDonationClaimCancelledEmails,
} = require('../utils/sendNotificationEmail');
const { performDonationClaim, notifyDonationClaimed } = require('../services/donationClaimService');
const { restoreParentQuantityOnCancel } = require('../utils/donationClaimFork');

const DONOR_ROLES = [
  'donor',
  'restaurant',
  'supermarket',
  'business',
  'individual',
];

function canCreateDonation(role) {
  const r = (role || '').toLowerCase();
  return DONOR_ROLES.includes(r);
}

function requireSupplierAccess(role) {
  return canCreateDonation(role);
}

const EDITABLE_STATUSES = ['available', 'draft'];
const MARKETPLACE_COMMISSION_RATE = 0.2;

function isDonorOwner(donation, userId) {
  return donation.donorId.toString() === userId.toString();
}

function roundCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return NaN;
  return Math.round(n * 100) / 100;
}

function applyMarketplaceCommission(basePrice) {
  const base = Number(basePrice);
  if (Number.isNaN(base) || base <= 0) return NaN;
  return roundCurrency(base * (1 + MARKETPLACE_COMMISSION_RATE));
}

function parseListingAndPrice(listingType, priceAmount) {
  const listing = (listingType || 'donate').toLowerCase() === 'sell' ? 'sell' : 'donate';
  let price = null;
  if (listing === 'sell') {
    const basePrice = Number(priceAmount);
    if (Number.isNaN(basePrice) || basePrice <= 0) {
      return { error: 'Please enter a valid price (LKR) for cash listings.' };
    }
    price = applyMarketplaceCommission(basePrice);
    if (Number.isNaN(price) || price <= 0) {
      return { error: 'Failed to apply marketplace commission for this listing.' };
    }
  }
  return { listing, price };
}

const HARD_REJECT_VISION_CODES = new Set(['AI_GENERATED_IMAGE']);

exports.analyzeImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_IMAGE',
        message: 'Please upload an image file (JPEG or PNG).',
      });
    }

    const imageUrl = await uploadDonationImage({
      userId: req.user._id.toString(),
      file,
    });

    try {
      const predictions = await analyzeFoodImage(file.buffer, file.mimetype);
      return res.json({
        success: true,
        imageUrl,
        predictions,
        aiAnalysisFailed: false,
      });
    } catch (visionErr) {
      if (visionErr instanceof FoodVisionError && HARD_REJECT_VISION_CODES.has(visionErr.code)) {
        return res.status(visionErr.statusCode).json({
          success: false,
          code: visionErr.code,
          message: visionErr.message,
        });
      }

      const failureCode =
        visionErr instanceof FoodVisionError ? visionErr.code : 'GEMINI_UNAVAILABLE';
      const failureMessage =
        visionErr instanceof FoodVisionError
          ? visionErr.message
          : visionErr.message || 'Food image analysis is temporarily unavailable.';

      console.warn('[analyzeImage] AI analysis failed after upload; allowing manual entry:', failureMessage);

      return res.json({
        success: true,
        imageUrl,
        predictions: null,
        aiAnalysisFailed: true,
        aiFailureCode: failureCode,
        message: failureMessage,
      });
    }
  } catch (err) {
    console.error('analyzeImage error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to analyze image',
    });
  }
};

exports.createDonation = async (req, res) => {
  try {
    if (!canCreateDonation(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your account cannot create donations.',
      });
    }

    const body = req.body || {};
    const {
      foodCategory,
      itemName,
      quantity,
      storageRecommendation,
      imageUrl,
      userProvidedExpiryDate,
      aiConfidence,
      aiQualityScore,
      aiFreshness,
      aiDetectedItems,
      productType,
      expiryDateFromPackage,
      listingType,
      priceAmount,
      priceCurrency,
      aiSuggestedPrice,
      pickupAddress,
      donorLatitude,
      donorLongitude,
    } = body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'Please upload an image first.' });
    }
    if (!foodCategory?.trim() || !itemName?.trim()) {
      return res.status(400).json({ success: false, message: 'Food category and item name are required.' });
    }
    const qty = Number(quantity);
    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }
    if (!storageRecommendation?.trim()) {
      return res.status(400).json({ success: false, message: 'Storage instructions are required.' });
    }
    if (!userProvidedExpiryDate) {
      return res.status(400).json({ success: false, message: 'Expiry date is required.' });
    }

    if (!pickupAddress?.trim()) {
      return res.status(400).json({ success: false, message: 'Pickup address is required.' });
    }

    const lat = Number(donorLatitude);
    const lng = Number(donorLongitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid pickup location is required.' });
    }

    const quality = aiQualityScore != null ? Number(aiQualityScore) : null;
    if (quality != null && !Number.isNaN(quality) && quality < 0.8) {
      return res.status(400).json({
        success: false,
        message: `Food quality score is ${Math.round(quality * 100)}% (minimum 80% required).`,
      });
    }

    const parsedListing = parseListingAndPrice(listingType, priceAmount);
    if (parsedListing.error) {
      return res.status(400).json({
        success: false,
        message: parsedListing.error,
      });
    }

    const aiPrice =
      aiSuggestedPrice != null && !Number.isNaN(Number(aiSuggestedPrice))
        ? Math.max(0, Math.round(Number(aiSuggestedPrice)))
        : null;

    const donation = await Donation.create({
      donorId: req.user._id,
      foodCategory: foodCategory.trim(),
      itemName: itemName.trim(),
      quantity: qty,
      initialQuantity: qty,
      storageRecommendation: storageRecommendation.trim(),
      imageUrl: imageUrl.trim(),
      userProvidedExpiryDate,
      aiConfidence: aiConfidence != null ? Number(aiConfidence) : null,
      aiQualityScore: quality,
      aiFreshness: aiFreshness || null,
      aiDetectedItems: Array.isArray(aiDetectedItems) ? aiDetectedItems : [],
      productType: productType || null,
      expiryDateFromPackage: expiryDateFromPackage || null,
      listingType: parsedListing.listing,
      priceAmount: parsedListing.listing === 'sell' ? parsedListing.price : null,
      priceCurrency: parsedListing.listing === 'sell' ? (priceCurrency || 'LKR').trim() : 'LKR',
      aiSuggestedPrice: aiPrice,
      pickupAddress: pickupAddress.trim(),
      donorLatitude: lat,
      donorLongitude: lng,
      status: 'available',
    });

    sendDonationPostedEmail(req.user, donation);
    sendNewDonationToAllReceivers(donation, req.user);

    const populated = await Donation.findById(donation._id).populate(
      'donorId',
      'username businessName role'
    );
    if (populated) {
      emitToReceivers('donation:created', {
        donation: toAvailableDonationJSON(populated, null),
        donorName: getDonorDisplayName(populated.donorId),
      });
    }

    return res.status(201).json({
      success: true,
      donation: donation.toPublicJSON(),
    });
  } catch (err) {
    console.error('createDonation error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create donation',
    });
  }
};

exports.getAvailableDonations = async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (!(isReceiverRole(req.user.role) || role === 'customer')) {
      return res.status(403).json({
        success: false,
        message: 'Only receivers and customers can browse available donations.',
      });
    }

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Receiver location (lat and lng) is required.',
      });
    }

    const donations = await Donation.find({
      status: 'available',
      parentListingId: null,
      quantity: { $gt: 0 },
    })
      .populate('donorId', 'username businessName role')
      .sort({ createdAt: -1 });

    const results = [];
    for (const donation of donations) {
      if (isDonationExpired(donation.userProvidedExpiryDate)) continue;
      if (
        donation.donorLatitude == null ||
        donation.donorLongitude == null ||
        Number.isNaN(Number(donation.donorLatitude)) ||
        Number.isNaN(Number(donation.donorLongitude))
      ) {
        continue;
      }

      const distanceKm = calculateDistanceKm(
        lat,
        lng,
        donation.donorLatitude,
        donation.donorLongitude
      );
      if (distanceKm == null || distanceKm > MAX_RECEIVER_RADIUS_KM) continue;

      results.push(toAvailableDonationJSON(donation, distanceKm));
    }

    results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    return res.json({
      success: true,
      donations: results,
      maxRadiusKm: MAX_RECEIVER_RADIUS_KM,
    });
  } catch (err) {
    console.error('getAvailableDonations error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load available donations',
    });
  }
};

exports.getDeliveryQuote = async (req, res) => {
  try {
    if (!isReceiverRole(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only receivers can request delivery quotes.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const lat = req.query.lat;
    const lng = req.query.lng;
    const claimQuantity = Math.max(1, Math.round(Number(req.query.quantity) || 1));

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    if (donation.status !== 'available' || donation.parentListingId) {
      return res.status(400).json({
        success: false,
        message: 'This listing is no longer available.',
      });
    }
    if (claimQuantity > donation.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${donation.quantity} serving(s) available.`,
      });
    }

    const quoteResult = await buildReceiverDeliveryQuoteForDonation(
      donation,
      req.user,
      lat,
      lng,
      claimQuantity
    );
    if (quoteResult.error) {
      return res.status(400).json({ success: false, message: quoteResult.error });
    }

    return res.json({
      success: true,
      quote: quoteResult,
      itemName: donation.itemName || 'Food listing',
      listingType: donation.listingType,
    });
  } catch (err) {
    console.error('getDeliveryQuote error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to calculate delivery quote',
    });
  }
};

exports.claimDonation = async (req, res) => {
  try {
    if (!isReceiverRole(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only receivers can claim donations.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const body = req.body || {};
    const claimQuantity = Math.max(1, Math.round(Number(body.claimQuantity) || 1));

    let parent;
    let child;
    let claimQuantityResult;

    try {
      ({ parent, child, claimQuantity: claimQuantityResult } = await performDonationClaim({
        donationId: id,
        receiverUser: req.user,
        receiverLatitude: body.receiverLatitude,
        receiverLongitude: body.receiverLongitude,
        receiverAddress: body.receiverAddress,
        claimQuantity,
        paymentOrderId: body.paymentOrderId,
      }));
    } catch (claimErr) {
      const status = claimErr.statusCode || 500;
      if (status >= 400 && status < 500) {
        return res.status(status).json({ success: false, message: claimErr.message });
      }
      throw claimErr;
    }

    const { claimPayload, parentPayload } = notifyDonationClaimed({ child, parent });

    return res.json({
      success: true,
      donation: claimPayload,
      parentListing: parentPayload,
      claimQuantity: claimQuantityResult,
    });
  } catch (err) {
    console.error('claimDonation error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to claim donation',
    });
  }
};

exports.cancelClaim = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(id).populate([
      { path: 'donorId', select: 'username businessName role email' },
      { path: 'receiverId', select: 'username receiverName email' },
    ]);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    if (donation.status !== 'claimed') {
      return res.status(400).json({
        success: false,
        message:
          'This claim can only be cancelled before a driver is assigned. It may already be in transit or delivered.',
      });
    }

    const userId = req.user._id.toString();
    const isReceiver =
      isReceiverRole(req.user.role) &&
      donation.receiverId &&
      donation.receiverId._id?.toString?.() === userId;
    const isDonor = isDonorOwner(donation, req.user._id);

    if (!isReceiver && !isDonor) {
      return res.status(403).json({
        success: false,
        message: 'Not allowed to cancel this claim.',
      });
    }

    const receiverUser = donation.receiverId;
    const donorUser = donation.donorId;
    const parentListingId = donation.parentListingId?.toString?.() || null;

    donation.receiverId = null;
    donation.receiverLatitude = null;
    donation.receiverLongitude = null;
    donation.receiverAddress = null;
    donation.claimedAt = null;

    let parentPayload = null;
    if (parentListingId) {
      donation.status = 'cancelled';
      await donation.save();
      const parent = await restoreParentQuantityOnCancel(donation);
      if (parent) {
        parentPayload = toAvailableDonationJSON(parent, null);
      }
    } else {
      donation.status = 'available';
      await donation.save();
      parentPayload = donation.toPublicJSON();
    }

    const donationId = donation._id.toString();
    const donorId = donorUser._id?.toString?.() || donorUser.toString();

    if (parentListingId && parentPayload) {
      emitToReceivers('donation:stockUpdated', {
        donationId: parentListingId,
        donation: parentPayload,
      });
    } else {
      emitToReceivers('donation:claimCancelled', {
        donationId,
        donation: parentPayload,
      });
    }

    emitToDonor(donorId, 'donation:claimCancelledForDonor', {
      donationId,
      donorId,
      donation: donation.toPublicJSON(),
      parentListing: parentPayload,
    });
    emitToDrivers('donation:claimCancelled', { donationId });

    sendDonationClaimCancelledEmails(donation, donorUser, receiverUser);

    return res.json({
      success: true,
      message: parentListingId
        ? 'Claim cancelled. Servings returned to the listing.'
        : 'Claim cancelled. The listing is available for receivers again.',
      donation: donation.toPublicJSON(),
      parentListing: parentPayload,
    });
  } catch (err) {
    console.error('cancelClaim error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to cancel claim',
    });
  }
};

exports.getMyClaims = async (req, res) => {
  try {
    if (!isReceiverRole(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only receivers can view claims.',
      });
    }

    const donations = await Donation.find({
      receiverId: req.user._id,
      status: { $nin: ['cancelled', 'draft'] },
    })
      .populate('donorId', 'username businessName role')
      .populate('receiverId', 'username receiverName')
      .populate('parentListingId')
      .sort({ claimedAt: -1, createdAt: -1 });

    return res.json({
      success: true,
      donations: donations.map((d) => enrichClaimFromParent(d)),
    });
  } catch (err) {
    console.error('getMyClaims error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load claims',
    });
  }
};

exports.getMyDonations = async (req, res) => {
  try {
    if (!canCreateDonation(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your account cannot view donations.',
      });
    }

    const donations = await Donation.find({ donorId: req.user._id })
      .populate('receiverId', 'receiverName username email')
      .populate('driverId', 'driverName username email')
      .populate('parentListingId')
      .sort({ createdAt: -1 })
      .lean(false);

    const childrenByParent = indexChildClaimsByParent(donations);

    return res.json({
      success: true,
      donations: donations.map((d) =>
        d.parentListingId
          ? enrichClaimFromParent(d)
          : enrichParentListingForDonor(d, childrenByParent)
      ),
    });
  } catch (err) {
    console.error('getMyDonations error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load donations',
    });
  }
};

exports.getDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    if (!isDonorOwner(donation, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to view this donation.' });
    }

    return res.json({
      success: true,
      donation: donation.toPublicJSON(),
    });
  } catch (err) {
    console.error('getDonationById error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load donation',
    });
  }
};

exports.updateDonation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    if (!isDonorOwner(donation, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to update this donation.' });
    }
    if (!EDITABLE_STATUSES.includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: 'This donation can no longer be edited.',
      });
    }

    const body = req.body || {};
    const {
      foodCategory,
      itemName,
      quantity,
      storageRecommendation,
      imageUrl,
      userProvidedExpiryDate,
      listingType,
      priceAmount,
      priceCurrency,
      pickupAddress,
      donorLatitude,
      donorLongitude,
    } = body;

    if (foodCategory !== undefined) {
      if (!foodCategory?.trim()) {
        return res.status(400).json({ success: false, message: 'Food category is required.' });
      }
      donation.foodCategory = foodCategory.trim();
    }
    if (itemName !== undefined) {
      if (!itemName?.trim()) {
        return res.status(400).json({ success: false, message: 'Item name is required.' });
      }
      donation.itemName = itemName.trim();
    }
    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (!qty || qty < 1) {
        return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
      }
      const initialQty = donation.initialQuantity ?? donation.quantity;
      const claimedQty = Math.max(0, initialQty - donation.quantity);
      if (qty < claimedQty) {
        return res.status(400).json({
          success: false,
          message: `Quantity cannot be less than ${claimedQty} already claimed.`,
        });
      }
      donation.quantity = qty;
      if (!donation.parentListingId) {
        donation.initialQuantity = qty;
      }
    }
    if (storageRecommendation !== undefined) {
      if (!storageRecommendation?.trim()) {
        return res.status(400).json({ success: false, message: 'Storage instructions are required.' });
      }
      donation.storageRecommendation = storageRecommendation.trim();
    }
    if (imageUrl !== undefined && imageUrl?.trim()) {
      donation.imageUrl = imageUrl.trim();
    }
    if (userProvidedExpiryDate !== undefined) {
      if (!userProvidedExpiryDate) {
        return res.status(400).json({ success: false, message: 'Expiry date is required.' });
      }
      donation.userProvidedExpiryDate = userProvidedExpiryDate;
    }
    if (listingType !== undefined || priceAmount !== undefined) {
      const listingInput = listingType !== undefined ? listingType : donation.listingType;
      const nextListing = (listingInput || 'donate').toLowerCase() === 'sell' ? 'sell' : 'donate';

      if (nextListing === 'donate') {
        donation.listingType = 'donate';
        donation.priceAmount = null;
        donation.priceCurrency = 'LKR';
      } else {
        // Re-apply commission only when supplier explicitly provides a new base price.
        if (priceAmount !== undefined) {
          const parsed = parseListingAndPrice(nextListing, priceAmount);
          if (parsed.error) {
            return res.status(400).json({ success: false, message: parsed.error });
          }
          donation.priceAmount = parsed.price;
        } else if (donation.listingType !== 'sell' || !donation.priceAmount || donation.priceAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid price (LKR) for cash listings.',
          });
        }
        donation.listingType = 'sell';
        donation.priceCurrency = (priceCurrency || donation.priceCurrency || 'LKR').trim();
      }
    }
    if (pickupAddress !== undefined) {
      if (!pickupAddress?.trim()) {
        return res.status(400).json({ success: false, message: 'Pickup address is required.' });
      }
      donation.pickupAddress = pickupAddress.trim();
    }
    if (donorLatitude !== undefined && donorLongitude !== undefined) {
      const lat = Number(donorLatitude);
      const lng = Number(donorLongitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ success: false, message: 'Valid pickup location is required.' });
      }
      donation.donorLatitude = lat;
      donation.donorLongitude = lng;
    }

    await donation.save();

    return res.json({
      success: true,
      donation: donation.toPublicJSON(),
    });
  } catch (err) {
    console.error('updateDonation error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update donation',
    });
  }
};

exports.deleteDonation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    if (!isDonorOwner(donation, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to cancel this donation.' });
    }
    if (donation.status === 'cancelled') {
      return res.json({ success: true, donation: donation.toPublicJSON() });
    }
    if (!EDITABLE_STATUSES.includes(donation.status)) {
      return res.status(400).json({
        success: false,
        message: 'This donation can no longer be cancelled.',
      });
    }

    donation.status = 'cancelled';
    await donation.save();

    const donationId = donation._id.toString();
    emitToReceivers('donation:cancelled', { donationId });
    emitToDrivers('donation:cancelled', { donationId });

    return res.json({
      success: true,
      donation: donation.toPublicJSON(),
    });
  } catch (err) {
    console.error('deleteDonation error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to cancel donation',
    });
  }
};

exports.getDiscountSuggestion = async (req, res) => {
  try {
    if (!requireSupplierAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only suppliers can request discount suggestions.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    if (!isDonorOwner(donation, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to access this listing.' });
    }

    if (donation.listingType !== 'sell') {
      return res.json({
        success: true,
        noOp: true,
        suggestion: {
          suggestedPrice: 0,
          discountPercent: 0,
          isFreeRecommendation: true,
          reasoning: 'This listing is already in donate mode, so no discount is needed.',
        },
      });
    }

    const lat = Number(donation.donorLatitude);
    const lng = Number(donation.donorLongitude);

    let currentWeather = null;
    let forecastWeather = null;
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      try {
        currentWeather = await getCurrentWeatherByCoords(lat, lng, 'metric');
        forecastWeather = await getForecastWeatherByCoords(lat, lng, 'metric');
      } catch (err) {
        console.warn('getDiscountSuggestion weather fetch fallback:', err?.message || err);
      }
    }

    const suggestion = await generateDiscountSuggestion({
      donation,
      currentWeather,
      forecastWeather,
    });

    donation.discountMeta = {
      ...(donation.discountMeta || {}),
      lastSuggestedPrice: suggestion.suggestedPrice,
      lastSuggestedAt: new Date(),
      lastDiscountPercent: suggestion.discountPercent,
      lastSuggestionReason: suggestion.reasoning,
      lastIsFreeRecommendation: suggestion.isFreeRecommendation,
    };
    await donation.save();

    return res.json({
      success: true,
      suggestion,
      donation: donation.toPublicJSON(),
    });
  } catch (err) {
    console.error('getDiscountSuggestion error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate discount suggestion',
    });
  }
};

exports.applyDiscountSuggestion = async (req, res) => {
  try {
    if (!requireSupplierAccess(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only suppliers can apply discount suggestions.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid donation id.' });
    }

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    if (!isDonorOwner(donation, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to update this listing.' });
    }
    if (donation.listingType !== 'sell') {
      return res.status(400).json({ success: false, message: 'Discounts can only be applied to sell listings.' });
    }

    const suggestedPrice = Number(req.body?.suggestedPrice);
    if (Number.isNaN(suggestedPrice) || suggestedPrice < 0) {
      return res.status(400).json({ success: false, message: 'A valid suggestedPrice is required.' });
    }

    const roundedPrice = Math.round(suggestedPrice);
    const currentPrice = Number(donation.priceAmount);
    if (Number.isNaN(currentPrice) || currentPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Current listing price is invalid.' });
    }
    if (roundedPrice > currentPrice) {
      return res.status(400).json({ success: false, message: 'Discounted price cannot exceed current price.' });
    }
    const oldPrice = currentPrice;

    donation.discountMeta = {
      ...(donation.discountMeta || {}),
      lastAppliedPrice: roundedPrice,
      lastOriginalPrice: currentPrice,
      lastAppliedAt: new Date(),
      lastAppliedBy: req.user._id,
    };
    donation.priceAmount = roundedPrice;
    await donation.save();

    if (roundedPrice < oldPrice) {
      sendAiPriceReductionToReceiversAndCustomers({
        donation,
        oldPrice,
        newPrice: roundedPrice,
      });
    }

    return res.json({
      success: true,
      donation: donation.toPublicJSON(),
    });
  } catch (err) {
    console.error('applyDiscountSuggestion error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to apply discount suggestion',
    });
  }
};
