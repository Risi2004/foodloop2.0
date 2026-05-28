const { sendMail } = require('../config/mailer');
const User = require('../models/User');
const {
  accountCreatedEmail,
  pendingApprovalEmail,
  accountApprovedEmail,
  accountRejectedEmail,
  accountDeactivatedEmail,
  accountReactivatedEmail,
  passwordResetOtpEmail,
  passwordChangedEmail,
  donationPostedEmail,
  newDonationAvailableEmail,
  donationClaimedDonorEmail,
  donationClaimedReceiverEmail,
  donationClaimCancelledDonorEmail,
  donationClaimCancelledReceiverEmail,
  donationNewPickupDriverEmail,
  donationDriverAssignedDonorEmail,
  donationDriverAssignedReceiverEmail,
  donationDriverAssignedDriverEmail,
  donationPickupConfirmedDonorEmail,
  donationPickupConfirmedReceiverEmail,
  donationDeliveredDonorEmail,
  donationDeliveredReceiverEmail,
  paymentInvoiceEmail,
  customerOrderNewPickupDriverEmail,
} = require('./emailTemplates');
const {
  getDonorDisplayName,
  getReceiverDisplayName,
  getDriverDisplayName,
} = require('./donationHelpers');

function getFrontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function getLoginUrl() {
  return `${getFrontendBase()}/login`;
}

function getSupplierMyDonationsUrl() {
  return `${getFrontendBase()}/supplier/my-donation`;
}

/** @deprecated Use getSupplierMyDonationsUrl */
const getDonorMyDonationsUrl = getSupplierMyDonationsUrl;

function getReceiverFindFoodUrl() {
  return `${getFrontendBase()}/receiver/find-food`;
}

function getReceiverMyClaimsUrl() {
  return `${getFrontendBase()}/receiver/my-claims`;
}

function getDriverMyPickupsUrl() {
  return `${getFrontendBase()}/driver/my-pickups`;
}

function getSupplierTrackOrderUrl(donationId) {
  return `${getFrontendBase()}/supplier/track-order?donationId=${donationId}`;
}

/** @deprecated Use getSupplierTrackOrderUrl */
const getDonorTrackOrderUrl = getSupplierTrackOrderUrl;

function getReceiverTrackOrderUrl(donationId) {
  return `${getFrontendBase()}/receiver/track-order?donationId=${donationId}`;
}

function getDriverPickupUrl(donationId) {
  return `${getFrontendBase()}/driver/pickup?donationId=${donationId}`;
}

function getDonationPayload(donation) {
  return typeof donation.toPublicJSON === 'function' ? donation.toPublicJSON() : donation;
}

function getUserDisplayName(user) {
  if (!user) return 'there';
  return (
    user.username ||
    user.receiverName ||
    user.driverName ||
    user.businessName ||
    user.email ||
    'there'
  );
}

async function sendSafe(to, templateFn, user) {
  try {
    const name = getUserDisplayName(user);
    const loginUrl = getLoginUrl();
    const { subject, html, text } = templateFn({ name, loginUrl });
    await sendMail({ to, subject, text, html });
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message);
  }
}

async function sendAccountCreatedEmail(user) {
  await sendSafe(user.email, accountCreatedEmail, user);
}

async function sendPendingApprovalEmail(user) {
  await sendSafe(user.email, pendingApprovalEmail, user);
}

async function sendAccountApprovedEmail(user) {
  await sendSafe(user.email, accountApprovedEmail, user);
}

async function sendAccountRejectedEmail(user) {
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = accountRejectedEmail({ name, loginUrl: getLoginUrl() });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Failed to send rejection to ${user.email}:`, err.message);
  }
}

async function sendAccountDeactivatedEmail(user) {
  await sendSafe(user.email, accountDeactivatedEmail, user);
}

async function sendAccountReactivatedEmail(user) {
  await sendSafe(user.email, accountReactivatedEmail, user);
}

async function sendPasswordResetOtpEmail(user, otp) {
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = passwordResetOtpEmail({ name, otp });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Failed to send password reset OTP to ${user.email}:`, err.message);
  }
}

async function sendPasswordChangedEmail(user) {
  await sendSafe(user.email, passwordChangedEmail, user);
}

async function sendDonationPostedEmail(user, donation) {
  if (!user?.email || !donation) return;
  try {
    const name = getUserDisplayName(user);
    const payload = getDonationPayload(donation);
    const { subject, html, text } = donationPostedEmail({
      name,
      donation: payload,
      myDonationsUrl: getDonorMyDonationsUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Failed to send donation posted email to ${user.email}:`, err.message);
  }
}

async function sendNewDonationToAllReceivers(donation, donorUser) {
  if (!donation) return;
  try {
    const receivers = await User.find({
      role: { $regex: /^receiver$/i },
      isEmailVerified: true,
      accountStatus: 'active',
    })
      .select('email receiverName username')
      .lean();

    if (!receivers.length) {
      console.log('[email] No active receivers to notify about new donation');
      return;
    }

    const payload = getDonationPayload(donation);
    const donorName = getUserDisplayName(donorUser);
    const findFoodUrl = getReceiverFindFoodUrl();
    let sent = 0;

    for (const receiver of receivers) {
      if (!receiver.email) continue;
      try {
        const name = getUserDisplayName(receiver);
        const { subject, html, text } = newDonationAvailableEmail({
          name,
          donation: payload,
          donorName,
          findFoodUrl,
        });
        await sendMail({ to: receiver.email, subject, text, html });
        sent += 1;
      } catch (err) {
        console.error(
          `[email] Failed to send new donation alert to ${receiver.email}:`,
          err.message
        );
      }
    }

    console.log(
      `[email] New donation alerts sent to ${sent}/${receivers.length} receiver(s)`
    );
  } catch (err) {
    console.error('[email] Failed to notify receivers about new donation:', err.message);
  }
}

async function sendDonationClaimedEmails(donation, donorUser, receiverUser) {
  if (!donation) return;
  const payload = getDonationPayload(donation);
  const donorName = getDonorDisplayName(donorUser);
  const receiverName = getReceiverDisplayName(receiverUser);

  if (donorUser?.email) {
    try {
      const { subject, html, text } = donationClaimedDonorEmail({
        name: donorName,
        donation: payload,
        receiverName,
        myDonationsUrl: getDonorMyDonationsUrl(),
      });
      await sendMail({ to: donorUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Failed to send claim email to donor ${donorUser.email}:`, err.message);
    }
  }

  if (receiverUser?.email) {
    try {
      const { subject, html, text } = donationClaimedReceiverEmail({
        name: receiverName,
        donation: payload,
        myClaimsUrl: getReceiverMyClaimsUrl(),
      });
      await sendMail({ to: receiverUser.email, subject, text, html });
    } catch (err) {
      console.error(
        `[email] Failed to send claim confirmation to receiver ${receiverUser.email}:`,
        err.message
      );
    }
  }

  try {
    const drivers = await User.find({
      role: { $regex: /^driver$/i },
      isEmailVerified: true,
      accountStatus: 'active',
    })
      .select('email driverName username')
      .lean();

    const driverPickupsUrl = getDriverMyPickupsUrl();
    let sent = 0;
    for (const driver of drivers) {
      if (!driver.email) continue;
      try {
        const name = getUserDisplayName(driver);
        const { subject, html, text } = donationNewPickupDriverEmail({
          name,
          donation: payload,
          driverPickupsUrl,
        });
        await sendMail({ to: driver.email, subject, text, html });
        sent += 1;
      } catch (err) {
        console.error(`[email] Failed to send pickup alert to ${driver.email}:`, err.message);
      }
    }
    console.log(`[email] Pickup alerts sent to ${sent}/${drivers.length} driver(s)`);
  } catch (err) {
    console.error('[email] Failed to notify drivers about claim:', err.message);
  }
}

async function sendDonationClaimCancelledEmails(donation, donorUser, receiverUser) {
  if (!donation) return;
  const payload = getDonationPayload(donation);
  const donorName = getDonorDisplayName(donorUser);
  const receiverName = getReceiverDisplayName(receiverUser);

  if (donorUser?.email) {
    try {
      const { subject, html, text } = donationClaimCancelledDonorEmail({
        name: donorName,
        donation: payload,
        receiverName,
        myDonationsUrl: getDonorMyDonationsUrl(),
      });
      await sendMail({ to: donorUser.email, subject, text, html });
    } catch (err) {
      console.error(
        `[email] Failed to send claim-cancelled email to donor ${donorUser.email}:`,
        err.message
      );
    }
  }

  if (receiverUser?.email) {
    try {
      const { subject, html, text } = donationClaimCancelledReceiverEmail({
        name: receiverName,
        donation: payload,
        myClaimsUrl: getReceiverMyClaimsUrl(),
      });
      await sendMail({ to: receiverUser.email, subject, text, html });
    } catch (err) {
      console.error(
        `[email] Failed to send claim-cancelled email to receiver ${receiverUser.email}:`,
        err.message
      );
    }
  }
}

async function sendDonationDriverAssignedEmails(donation, donorUser, receiverUser, driverUser) {
  if (!donation) return;
  const payload = getDonationPayload(donation);
  const donationId = donation._id?.toString?.() || donation.id;
  const donorName = getDonorDisplayName(donorUser);
  const receiverName = getReceiverDisplayName(receiverUser);
  const driverName = getDriverDisplayName(driverUser);

  if (donorUser?.email) {
    try {
      const { subject, html, text } = donationDriverAssignedDonorEmail({
        name: donorName,
        donation: payload,
        driverName,
        receiverName,
        trackOrderUrl: getDonorTrackOrderUrl(donationId),
        myDonationsUrl: getDonorMyDonationsUrl(),
      });
      await sendMail({ to: donorUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Driver-assigned email to donor failed:`, err.message);
    }
  }

  if (receiverUser?.email) {
    try {
      const { subject, html, text } = donationDriverAssignedReceiverEmail({
        name: receiverName,
        donation: payload,
        driverName,
        trackOrderUrl: getReceiverTrackOrderUrl(donationId),
        myClaimsUrl: getReceiverMyClaimsUrl(),
      });
      await sendMail({ to: receiverUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Driver-assigned email to receiver failed:`, err.message);
    }
  }

  if (driverUser?.email) {
    try {
      const { subject, html, text } = donationDriverAssignedDriverEmail({
        name: driverName,
        donation: payload,
        donorName,
        receiverName,
        pickupUrl: getDriverPickupUrl(donationId),
      });
      await sendMail({ to: driverUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Driver-assigned email to driver failed:`, err.message);
    }
  }
}

async function sendDonationPickupConfirmedEmails(donation, donorUser, receiverUser, driverUser) {
  if (!donation) return;
  const payload = getDonationPayload(donation);
  const donationId = donation._id?.toString?.() || donation.id;
  const driverName = getDriverDisplayName(driverUser);

  if (donorUser?.email) {
    try {
      const { subject, html, text } = donationPickupConfirmedDonorEmail({
        name: getDonorDisplayName(donorUser),
        donation: payload,
        driverName,
        trackOrderUrl: getDonorTrackOrderUrl(donationId),
        myDonationsUrl: getDonorMyDonationsUrl(),
      });
      await sendMail({ to: donorUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Pickup-confirmed email to donor failed:`, err.message);
    }
  }

  if (receiverUser?.email) {
    try {
      const { subject, html, text } = donationPickupConfirmedReceiverEmail({
        name: getReceiverDisplayName(receiverUser),
        donation: payload,
        driverName,
        trackOrderUrl: getReceiverTrackOrderUrl(donationId),
        myClaimsUrl: getReceiverMyClaimsUrl(),
      });
      await sendMail({ to: receiverUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Pickup-confirmed email to receiver failed:`, err.message);
    }
  }
}

async function sendDonationDeliveredEmails(donation, donorUser, receiverUser, driverUser) {
  if (!donation) return;
  const payload = getDonationPayload(donation);
  const driverName = getDriverDisplayName(driverUser);
  const receiverName = getReceiverDisplayName(receiverUser);

  if (donorUser?.email) {
    try {
      const { subject, html, text } = donationDeliveredDonorEmail({
        name: getDonorDisplayName(donorUser),
        donation: payload,
        driverName,
        receiverName,
        myDonationsUrl: getDonorMyDonationsUrl(),
      });
      await sendMail({ to: donorUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Delivered email to donor failed:`, err.message);
    }
  }

  if (receiverUser?.email) {
    try {
      const { subject, html, text } = donationDeliveredReceiverEmail({
        name: getReceiverDisplayName(receiverUser),
        donation: payload,
        driverName,
        myClaimsUrl: getReceiverMyClaimsUrl(),
      });
      await sendMail({ to: receiverUser.email, subject, text, html });
    } catch (err) {
      console.error(`[email] Delivered email to receiver failed:`, err.message);
    }
  }
}

async function sendPaymentInvoiceEmail(user, { payment, donation }) {
  if (!user?.email) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = paymentInvoiceEmail({
      name,
      orderId: payment.orderId,
      paidAt: payment.updatedAt || new Date(),
      itemName: donation?.itemName || 'Food listing',
      amount: payment.amount,
      currency: payment.currency || 'LKR',
      cardLast4: payment.cardLast4,
      myClaimsUrl: getReceiverMyClaimsUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Payment invoice failed for ${user.email}:`, err.message);
  }
}

async function sendCustomerOrderNewPickupToDrivers(customerOrder) {
  if (!customerOrder) return;
  try {
    const drivers = await User.find({
      role: { $regex: /^driver$/i },
      isEmailVerified: true,
      accountStatus: 'active',
    })
      .select('email driverName username')
      .lean();

    const driverPickupsUrl = getDriverMyPickupsUrl();
    let sent = 0;
    for (const driver of drivers) {
      if (!driver.email) continue;
      try {
        const name = getUserDisplayName(driver);
        const { subject, html, text } = customerOrderNewPickupDriverEmail({
          name,
          orderId: customerOrder.orderId,
          itemCount: customerOrder.orderSummary?.items?.length || 0,
          paymentMethod: customerOrder.paymentMethod || 'card',
          amount: customerOrder.orderSummary?.total ?? customerOrder.codAmount ?? 0,
          currency: customerOrder.currency || 'LKR',
          deliveryAddress: customerOrder.customerAddress || customerOrder.orderSummary?.address || '',
          driverPickupsUrl,
        });
        await sendMail({ to: driver.email, subject, text, html });
        sent += 1;
      } catch (err) {
        console.error(`[email] Failed to send customer order alert to ${driver.email}:`, err.message);
      }
    }
    console.log(`[email] Customer-order pickup alerts sent to ${sent}/${drivers.length} driver(s)`);
  } catch (err) {
    console.error('[email] Failed to notify drivers for customer order:', err.message);
  }
}

module.exports = {
  getLoginUrl,
  getSupplierMyDonationsUrl,
  getDonorMyDonationsUrl,
  getReceiverFindFoodUrl,
  getReceiverMyClaimsUrl,
  getDriverMyPickupsUrl,
  getSupplierTrackOrderUrl,
  getDonorTrackOrderUrl,
  getReceiverTrackOrderUrl,
  getDriverPickupUrl,
  getUserDisplayName,
  sendAccountCreatedEmail,
  sendPendingApprovalEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail,
  sendDonationPostedEmail,
  sendNewDonationToAllReceivers,
  sendDonationClaimedEmails,
  sendDonationClaimCancelledEmails,
  sendDonationDriverAssignedEmails,
  sendDonationPickupConfirmedEmails,
  sendDonationDeliveredEmails,
  sendPaymentInvoiceEmail,
  sendCustomerOrderNewPickupToDrivers,
};
