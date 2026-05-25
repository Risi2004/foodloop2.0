const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const { analyzeFoodImage, FoodVisionError } = require('../services/geminiFoodVision');
const { uploadDonationImage } = require('../utils/r2Storage');

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

const EDITABLE_STATUSES = ['available', 'draft'];

function isDonorOwner(donation, userId) {
  return donation.donorId.toString() === userId.toString();
}

function parseListingAndPrice(listingType, priceAmount) {
  const listing = (listingType || 'donate').toLowerCase() === 'sell' ? 'sell' : 'donate';
  let price = null;
  if (listing === 'sell') {
    price = Number(priceAmount);
    if (Number.isNaN(price) || price <= 0) {
      return { error: 'Please enter a valid price (LKR) for cash listings.' };
    }
  }
  return { listing, price };
}

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

    const predictions = await analyzeFoodImage(file.buffer, file.mimetype);
    const imageUrl = await uploadDonationImage({
      userId: req.user._id.toString(),
      file,
    });

    return res.json({
      success: true,
      imageUrl,
      predictions,
    });
  } catch (err) {
    if (err instanceof FoodVisionError) {
      return res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }

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
      preferredPickupDate,
      preferredPickupTimeFrom,
      preferredPickupTimeTo,
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
    if (!preferredPickupDate || !preferredPickupTimeFrom || !preferredPickupTimeTo) {
      return res.status(400).json({ success: false, message: 'Pickup window is required.' });
    }
    if (preferredPickupTimeFrom >= preferredPickupTimeTo) {
      return res.status(400).json({ success: false, message: 'Pickup end time must be after start time.' });
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

    const listing = (listingType || 'donate').toLowerCase() === 'sell' ? 'sell' : 'donate';
    let price = null;
    if (listing === 'sell') {
      price = Number(priceAmount);
      if (Number.isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid price (LKR) for cash listings.',
        });
      }
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
      storageRecommendation: storageRecommendation.trim(),
      imageUrl: imageUrl.trim(),
      preferredPickupDate,
      preferredPickupTimeFrom,
      preferredPickupTimeTo,
      userProvidedExpiryDate,
      aiConfidence: aiConfidence != null ? Number(aiConfidence) : null,
      aiQualityScore: quality,
      aiFreshness: aiFreshness || null,
      aiDetectedItems: Array.isArray(aiDetectedItems) ? aiDetectedItems : [],
      productType: productType || null,
      expiryDateFromPackage: expiryDateFromPackage || null,
      listingType: listing,
      priceAmount: listing === 'sell' ? price : null,
      priceCurrency: listing === 'sell' ? (priceCurrency || 'LKR').trim() : 'LKR',
      aiSuggestedPrice: aiPrice,
      pickupAddress: pickupAddress.trim(),
      donorLatitude: lat,
      donorLongitude: lng,
      status: 'available',
    });

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

exports.getMyDonations = async (req, res) => {
  try {
    if (!canCreateDonation(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your account cannot view donations.',
      });
    }

    const donations = await Donation.find({ donorId: req.user._id })
      .sort({ createdAt: -1 })
      .lean(false);

    return res.json({
      success: true,
      donations: donations.map((d) => d.toPublicJSON()),
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
      preferredPickupDate,
      preferredPickupTimeFrom,
      preferredPickupTimeTo,
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
      donation.quantity = qty;
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
    if (preferredPickupDate !== undefined) donation.preferredPickupDate = preferredPickupDate;
    if (preferredPickupTimeFrom !== undefined) donation.preferredPickupTimeFrom = preferredPickupTimeFrom;
    if (preferredPickupTimeTo !== undefined) donation.preferredPickupTimeTo = preferredPickupTimeTo;
    if (
      donation.preferredPickupTimeFrom &&
      donation.preferredPickupTimeTo &&
      donation.preferredPickupTimeFrom >= donation.preferredPickupTimeTo
    ) {
      return res.status(400).json({ success: false, message: 'Pickup end time must be after start time.' });
    }
    if (userProvidedExpiryDate !== undefined) {
      if (!userProvidedExpiryDate) {
        return res.status(400).json({ success: false, message: 'Expiry date is required.' });
      }
      donation.userProvidedExpiryDate = userProvidedExpiryDate;
    }
    if (listingType !== undefined || priceAmount !== undefined) {
      const listingInput = listingType !== undefined ? listingType : donation.listingType;
      const priceInput = priceAmount !== undefined ? priceAmount : donation.priceAmount;
      const parsed = parseListingAndPrice(listingInput, priceInput);
      if (parsed.error) {
        return res.status(400).json({ success: false, message: parsed.error });
      }
      donation.listingType = parsed.listing;
      donation.priceAmount = parsed.listing === 'sell' ? parsed.price : null;
      donation.priceCurrency = parsed.listing === 'sell' ? (priceCurrency || 'LKR').trim() : 'LKR';
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
