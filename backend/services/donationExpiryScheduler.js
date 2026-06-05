const Donation = require('../models/Donation');
const { isDonationExpired } = require('../utils/distance');
const { sendMail } = require('../config/mailer');
const { emitToReceivers } = require('../socket');

async function processExpiredDonations() {
  try {
    const unclaimedDonations = await Donation.find({
      status: 'available',
    }).populate('donorId', 'username businessName role email contactNo');

    let cancelledCount = 0;

    for (const donation of unclaimedDonations) {
      if (isDonationExpired(donation.userProvidedExpiryDate)) {
        donation.status = 'cancelled';
        await donation.save();
        cancelledCount++;

        // Notify real-time receiver interface that the listing has been cancelled/removed
        const donationId = donation._id.toString();
        emitToReceivers('donation:claimCancelled', {
          donationId,
          donation: donation.toPublicJSON(),
        });

        // Email the supplier
        const supplier = donation.donorId;
        if (supplier && supplier.email) {
          const supplierName = supplier.businessName || supplier.username || 'Supplier';
          const itemName = donation.itemName;
          const expiryDate = donation.userProvidedExpiryDate;

          const subject = `FoodLoop - Listing Expired: ${itemName}`;
          const text = `Hello ${supplierName},\n\nYour listing for "${itemName}" has expired on ${expiryDate} without being claimed by a receiver. It has been removed from our listings.\n\nThank you for trying to share food!\n- The FoodLoop Team`;
          const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #1F4E36; margin-bottom: 20px;">FoodLoop Listing Expired</h2>
              <p>Hello <strong>${supplierName}</strong>,</p>
              <p>Your listing for <strong>"${itemName}"</strong> expired on <strong>${expiryDate}</strong> without being claimed by any receiver. As a result, we have removed it from the FoodLoop listings.</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #1F4E36; margin: 20px 0;">
                <strong>Listing Details:</strong><br/>
                • Item Name: ${itemName}<br/>
                • Category: ${donation.foodCategory}<br/>
                • Expiry Date: ${expiryDate}<br/>
                • Quantity: ${donation.quantity} serving(s)
              </div>
              <p>Thank you for contributing to our community and helping reduce food waste!</p>
              <p>Best regards,<br/><strong>The FoodLoop Team</strong></p>
            </div>
          `;

          await sendMail({
            to: supplier.email,
            subject,
            text,
            html,
          }).catch((err) => {
            console.error(`[donationExpiryScheduler] Failed to send email to ${supplier.email}:`, err.message);
          });
        }
      }
    }

    if (cancelledCount > 0) {
      console.log(`[donationExpiryScheduler] Successfully checked and cancelled ${cancelledCount} expired donation(s).`);
    }
  } catch (err) {
    console.error('[donationExpiryScheduler] Error checking/cancelling expired donations:', err);
  }
}

function startExpiryScheduler() {
  const checkIntervalMs = Number(process.env.DONATION_EXPIRY_CHECK_INTERVAL_MS) || 10 * 60 * 1000; // Default 10 minutes

  // Run on startup
  processExpiredDonations();

  // Run periodically
  setInterval(processExpiredDonations, checkIntervalMs);

  console.log(`[donationExpiryScheduler] Auto-expiry checking enabled (every ${checkIntervalMs / 1000}s)`);
}

module.exports = { startExpiryScheduler, processExpiredDonations };
