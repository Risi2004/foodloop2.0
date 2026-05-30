const PDFDocument = require('pdfkit');
const Donation = require('../models/Donation');
const ImpactReceipt = require('../models/ImpactReceipt');
const {
  getDonorDisplayName,
  getReceiverDisplayName,
  getDriverDisplayName,
} = require('../utils/donationHelpers');
const { sendDigitalReceiptEmails } = require('../utils/sendNotificationEmail');
const {
  emitToDonor,
  emitToReceivers,
  emitToCustomer,
  emitToDrivers,
  emitToDonationRoom,
} = require('../socket');

/** Default serving weight (kg) for methane estimate when not provided by user. */
const DEFAULT_SERVING_WEIGHT_KG = 0.25;

const RECEIPT_POPULATE = [
  { path: 'donorId', select: 'username businessName role email contactNo' },
  { path: 'receiverId', select: 'username receiverName email contactNo role' },
  {
    path: 'driverId',
    select: 'username driverName email contactNo vehicleType vehicleNumber profileImage',
  },
];

function formatDeliveryDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function computeMethaneSaved(quantity, weightPerServing) {
  const q = Number(quantity);
  const w = Number(weightPerServing);
  if (Number.isNaN(q) || Number.isNaN(w) || q <= 0 || w <= 0) return 0;
  const totalWeightKg = q * w;
  return Math.round(totalWeightKg * 0.05 * 100) / 100;
}

function buildAutoReceiptFields(donation) {
  const quantity = donation.quantity || 1;
  const weightPerServing = DEFAULT_SERVING_WEIGHT_KG;
  const dropLocation =
    (donation.receiverAddress && String(donation.receiverAddress).trim()) ||
    (donation.pickupAddress && String(donation.pickupAddress).trim()) ||
    'Delivery location on file';

  return {
    dropLocation,
    peopleFed: quantity,
    weightPerServing,
    methaneSaved: computeMethaneSaved(quantity, weightPerServing),
    distanceTraveled:
      donation.deliveryDistanceKm != null ? Number(donation.deliveryDistanceKm) : null,
  };
}

function mapPartyUser(user, displayFn, extra = {}) {
  if (!user) return null;
  return {
    id: user._id?.toString?.() || user.toString?.(),
    name: displayFn(user),
    email: user.email || null,
    contactNo: user.contactNo || null,
    ...extra,
  };
}

function mapDriverUser(driver) {
  if (!driver) return null;
  return {
    id: driver._id?.toString?.() || driver.toString?.(),
    name: getDriverDisplayName(driver),
    email: driver.email || null,
    contactNo: driver.contactNo || null,
    vehicleType: driver.vehicleType || null,
    vehicleNumber: driver.vehicleNumber || null,
    profileImageUrl: driver.profileImage || null,
  };
}

function buildReceiptView(donation, receiptDoc) {
  const donationJson = donation.toPublicJSON ? donation.toPublicJSON() : donation;
  const receipt = receiptDoc?.toPublicJSON ? receiptDoc.toPublicJSON() : receiptDoc;

  return {
    donation: donationJson,
    donor: mapPartyUser(donation.donorId, getDonorDisplayName),
    receiver: mapPartyUser(donation.receiverId, getReceiverDisplayName, {
      address: donation.receiverAddress || null,
    }),
    driver: mapDriverUser(donation.driverId),
    deliveryDate: formatDeliveryDate(donation.deliveredAt),
    distanceTraveled: receipt?.distanceTraveled ?? donation.deliveryDistanceKm ?? null,
    receipt,
  };
}

async function loadDeliveredDonation(donationId) {
  const donation = await Donation.findById(donationId).populate(RECEIPT_POPULATE);
  if (!donation) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }
  if (donation.status !== 'delivered') {
    const err = new Error('Digital receipt is available only after delivery.');
    err.statusCode = 400;
    throw err;
  }
  return donation;
}

async function ensureReceiptForDonation(donation) {
  let receipt = await ImpactReceipt.findOne({ donationId: donation._id });
  if (receipt) {
    return receipt;
  }

  const fields = buildAutoReceiptFields(donation);
  const now = new Date();
  receipt = await ImpactReceipt.create({
    donationId: donation._id,
    ...fields,
    status: 'finalized',
    finalizedAt: now,
    generatedAt: now,
  });
  return receipt;
}

function generateReceiptPdfBuffer(view) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const green = '#1F4E36';
      const muted = '#666666';
      const { donation, donor, receiver, driver, deliveryDate, receipt } = view;

      doc.fillColor(green).fontSize(20).font('Helvetica-Bold').text('FoodLoop Digital Receipt');
      doc.moveDown(0.5);
      doc.fillColor(muted).fontSize(10).font('Helvetica').text(`Tracking ID: ${donation.trackingId || donation.id || '—'}`);
      if (deliveryDate) {
        doc.text(`Delivered: ${deliveryDate}`);
      }
      doc.moveDown(1);

      doc.fillColor(green).fontSize(14).font('Helvetica-Bold').text('Food Information');
      doc.fillColor('#000000').fontSize(11).font('Helvetica');
      doc.text(`Item: ${donation.itemName || 'Food item'}`);
      doc.text(`Category: ${donation.foodCategory || '—'}`);
      doc.text(`Quantity: ${donation.quantity ?? '—'} serving(s)`);
      doc.text(`Listing type: ${donation.listingType || 'donate'}`);
      if (donation.listingType === 'sell' && donation.priceAmount != null) {
        doc.text(`Price: ${donation.priceCurrency || 'LKR'} ${donation.priceAmount}`);
      }
      doc.moveDown(0.75);

      doc.fillColor(green).fontSize(14).font('Helvetica-Bold').text('Parties');
      doc.fillColor('#000000').fontSize(11).font('Helvetica');
      doc.text(`Supplier: ${donor?.name || '—'}${donor?.email ? ` (${donor.email})` : ''}`);
      doc.text(`Receiver: ${receiver?.name || '—'}${receiver?.email ? ` (${receiver.email})` : ''}`);
      doc.text(`Driver: ${driver?.name || '—'}${driver?.vehicleNumber ? ` — ${driver.vehicleNumber}` : ''}`);
      doc.moveDown(0.75);

      doc.fillColor(green).fontSize(14).font('Helvetica-Bold').text('Delivery Details');
      doc.fillColor('#000000').fontSize(11).font('Helvetica');
      doc.text(`Pickup: ${donation.pickupAddress || donation.donorAddress || '—'}`);
      doc.text(`Drop location: ${receipt?.dropLocation || receiver?.address || '—'}`);
      if (receipt?.distanceTraveled != null) {
        doc.text(`Distance: ${Number(receipt.distanceTraveled).toFixed(2)} km`);
      }
      if (donation.claimedAt) doc.text(`Claimed: ${formatDeliveryDate(donation.claimedAt)}`);
      if (donation.pickedUpAt) doc.text(`Picked up: ${formatDeliveryDate(donation.pickedUpAt)}`);
      if (donation.deliveredAt) doc.text(`Delivered: ${formatDeliveryDate(donation.deliveredAt)}`);
      doc.moveDown(0.75);

      if (receipt) {
        doc.fillColor(green).fontSize(14).font('Helvetica-Bold').text('Impact Summary');
        doc.fillColor('#000000').fontSize(11).font('Helvetica');
        doc.text(`People fed: ${receipt.peopleFed ?? '—'}`);
        doc.text(`Weight per serving: ${receipt.weightPerServing ?? '—'} kg`);
        doc.text(`Methane saved (est.): ${receipt.methaneSaved ?? '—'} kg`);
      }

      doc.moveDown(2);
      doc.fillColor(muted).fontSize(9).font('Helvetica').text('Generated automatically by FoodLoop after delivery confirmation.', {
        align: 'center',
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Create receipt if missing, build view + PDF. Idempotent per donationId.
 * @returns {{ created: boolean, receipt, pdfBuffer, view, donation }}
 */
async function issueDigitalReceiptForDonation(donationId) {
  const donation = await loadDeliveredDonation(donationId);
  const existing = await ImpactReceipt.findOne({ donationId: donation._id });
  const created = !existing;
  const receipt = await ensureReceiptForDonation(donation);
  const view = buildReceiptView(donation, receipt);
  const pdfBuffer = await generateReceiptPdfBuffer(view);
  return { created, receipt, pdfBuffer, view, donation };
}

async function getReceiptViewForDonation(donationId) {
  const donation = await loadDeliveredDonation(donationId);
  const receipt = await ImpactReceipt.findOne({ donationId: donation._id });
  if (!receipt) {
    const err = new Error('Digital receipt not yet available.');
    err.statusCode = 404;
    throw err;
  }
  return buildReceiptView(donation, receipt);
}

async function getReceiptPdfForDonation(donationId) {
  const view = await getReceiptViewForDonation(donationId);
  const pdfBuffer = await generateReceiptPdfBuffer(view);
  return { pdfBuffer, view };
}

function emitImpactReceiptUpdated(donation) {
  const donationId =
    donation._id?.toString?.() || donation.id?.toString?.() || String(donation._id || donation.id);
  const donorId =
    donation.donorId?._id?.toString?.() || donation.donorId?.toString?.() || donation.donorId;
  const receiverId =
    donation.receiverId?._id?.toString?.() || donation.receiverId?.toString?.() || donation.receiverId;
  const receiverRole = (donation.receiverId?.role || '').toLowerCase();
  const payload = { donationId };

  emitToDonationRoom(donationId, 'impact:updated', payload);
  if (donorId) emitToDonor(donorId, 'impact:updated', payload);
  if (receiverRole === 'customer' && receiverId) {
    emitToCustomer(receiverId, 'impact:updated', payload);
  } else {
    emitToReceivers('impact:updated', payload);
  }
  emitToDrivers('impact:updated', payload);
}

/**
 * Issue receipt on delivery (idempotent) and notify parties when newly created.
 */
async function finalizeAndNotifyDigitalReceipt(donationId) {
  const result = await issueDigitalReceiptForDonation(donationId);
  if (result.created) {
    await sendDigitalReceiptEmails(result.donation, result.view, result.pdfBuffer);
    emitImpactReceiptUpdated(result.donation);
  }
  return result;
}

module.exports = {
  DEFAULT_SERVING_WEIGHT_KG,
  buildReceiptView,
  buildAutoReceiptFields,
  ensureReceiptForDonation,
  generateReceiptPdfBuffer,
  issueDigitalReceiptForDonation,
  getReceiptViewForDonation,
  getReceiptPdfForDonation,
  finalizeAndNotifyDigitalReceipt,
  emitImpactReceiptUpdated,
  formatDeliveryDate,
};
