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
  digitalReceiptEmail,
  paymentInvoiceEmail,
  customerOrderNewPickupDriverEmail,
  aiPriceReductionAlertEmail,
  payoutSubmittedEmail,
  payoutApprovedEmail,
  payoutRejectedEmail,
  payoutPaidEmail,
  payoutAdminAlertEmail,
  scheduledMaintenanceAnnouncementEmail,
  scheduledMaintenanceStartedEmail,
  scheduledMaintenanceUpdatedEmail,
  suddenMaintenanceAnnouncementEmail,
  maintenanceCancelledEmail,
  supplierAiSubscriptionPaymentEmail,
  supplierAiAutoRenewCancelledEmail,
  supplierEsgSubscriptionPaymentEmail,
  supplierEsgAutoRenewCancelledEmail,
  supplierBundleSubscriptionPaymentEmail,
  supplierBundleAutoRenewCancelledEmail,
  adminLoginNotificationEmail,
} = require('./emailTemplates');
const {
  getDonorDisplayName,
  getReceiverDisplayName,
  getDriverDisplayName,
} = require('./donationHelpers');
const { formatTransferDueDate } = require('./workingDays');

function getFrontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function getLoginUrl() {
  return `${getFrontendBase()}/login`;
}

function getSupplierMyDonationsUrl() {
  return `${getFrontendBase()}/supplier/my-donation`;
}

function getSupplierEsgCsrUrl() {
  return `${getFrontendBase()}/supplier/esg-csr`;
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

function getSupplierDigitalReceiptUrl(donationId) {
  return `${getFrontendBase()}/supplier/digital-receipt?donationId=${donationId}`;
}

function getReceiverDigitalReceiptUrl(donationId) {
  return `${getFrontendBase()}/receiver/digital-receipt?donationId=${donationId}`;
}

function getCustomerDigitalReceiptUrl(donationId) {
  return `${getFrontendBase()}/customer/digital-receipt?donationId=${donationId}`;
}

function getDriverDigitalReceiptUrl(donationId) {
  return `${getFrontendBase()}/driver/digital-receipt?donationId=${donationId}`;
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

async function sendDigitalReceiptEmails(donation, view, pdfBuffer) {
  if (!donation || !view || !pdfBuffer) return;

  const donationId =
    donation._id?.toString?.() || donation.id?.toString?.() || String(donation._id || donation.id);
  const payload = getDonationPayload(donation);
  const deliveryDate = view.deliveryDate || null;
  const trackingId = payload.trackingId || donationId;
  const filename = `impact-receipt-${trackingId}.pdf`;
  const attachment = {
    filename,
    content: pdfBuffer,
    contentType: 'application/pdf',
  };

  const donorUser = donation.donorId;
  const receiverUser = donation.receiverId;
  const driverUser = donation.driverId;

  const recipients = [
    {
      user: donorUser,
      name: getDonorDisplayName(donorUser),
      receiptUrl: getSupplierDigitalReceiptUrl(donationId),
    },
    {
      user: receiverUser,
      name: getReceiverDisplayName(receiverUser),
      receiptUrl:
        (receiverUser?.role || '').toLowerCase() === 'customer'
          ? getCustomerDigitalReceiptUrl(donationId)
          : getReceiverDigitalReceiptUrl(donationId),
    },
    {
      user: driverUser,
      name: getDriverDisplayName(driverUser),
      receiptUrl: getDriverDigitalReceiptUrl(donationId),
    },
  ];

  for (const { user, name, receiptUrl } of recipients) {
    if (!user?.email) continue;
    try {
      const { subject, html, text } = digitalReceiptEmail({
        name,
        donation: payload,
        receiptUrl,
        deliveryDate,
      });
      await sendMail({
        to: user.email,
        subject,
        text,
        html,
        attachments: [attachment],
      });
    } catch (err) {
      console.error(`[email] Digital receipt email to ${user.email} failed:`, err.message);
    }
  }
}

async function sendSupplierAiSubscriptionPaymentEmail(user, { payment, subscription, isRenewal }) {
  if (!user?.email || !payment) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = supplierAiSubscriptionPaymentEmail({
      name,
      orderId: payment.orderId,
      paidAt: payment.updatedAt || new Date(),
      amount: payment.amount,
      currency: payment.currency || 'LKR',
      cardLast4: payment.cardLast4,
      expiresAt: subscription?.expiresAt,
      autoRenew: !!(subscription?.autoRenew && !subscription?.autoRenewCancelledAt),
      isRenewal: !!isRenewal,
      myDonationsUrl: getSupplierMyDonationsUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Supplier AI subscription payment failed for ${user.email}:`, err.message);
  }
}

async function sendSupplierEsgSubscriptionPaymentEmail(user, { payment, subscription, isRenewal }) {
  if (!user?.email || !payment) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = supplierEsgSubscriptionPaymentEmail({
      name,
      orderId: payment.orderId,
      paidAt: payment.updatedAt || new Date(),
      amount: payment.amount,
      currency: payment.currency || 'LKR',
      cardLast4: payment.cardLast4,
      expiresAt: subscription?.expiresAt,
      autoRenew: !!(subscription?.autoRenew && !subscription?.autoRenewCancelledAt),
      isRenewal: !!isRenewal,
      esgDashboardUrl: getSupplierEsgCsrUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] ESG subscription payment failed for ${user.email}:`, err.message);
  }
}

async function sendSupplierEsgAutoRenewCancelledEmail(user, { expiresAt, amount, currency }) {
  if (!user?.email) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = supplierEsgAutoRenewCancelledEmail({
      name,
      expiresAt,
      amount,
      currency,
      esgDashboardUrl: getSupplierEsgCsrUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] ESG cancel renew failed for ${user.email}:`, err.message);
  }
}

async function sendSupplierAiAutoRenewCancelledEmail(user, { expiresAt, amount, currency }) {
  if (!user?.email) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = supplierAiAutoRenewCancelledEmail({
      name,
      expiresAt,
      amount,
      currency,
      myDonationsUrl: getSupplierMyDonationsUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Supplier AI cancel renew failed for ${user.email}:`, err.message);
  }
}

async function sendSupplierBundleSubscriptionPaymentEmail(user, { payment, subscription, isRenewal }) {
  if (!user?.email || !payment) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = supplierBundleSubscriptionPaymentEmail({
      name,
      orderId: payment.orderId,
      paidAt: payment.updatedAt || new Date(),
      amount: payment.amount,
      currency: payment.currency || 'LKR',
      cardLast4: payment.cardLast4,
      expiresAt: subscription?.expiresAt,
      autoRenew: !!(subscription?.autoRenew && !subscription?.autoRenewCancelledAt),
      isRenewal: !!isRenewal,
      myDonationsUrl: getSupplierMyDonationsUrl(),
      esgDashboardUrl: getSupplierEsgCsrUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Bundle subscription payment failed for ${user.email}:`, err.message);
  }
}

async function sendSupplierBundleAutoRenewCancelledEmail(user, { expiresAt, amount, currency }) {
  if (!user?.email) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = supplierBundleAutoRenewCancelledEmail({
      name,
      expiresAt,
      amount,
      currency,
      myDonationsUrl: getSupplierMyDonationsUrl(),
      esgDashboardUrl: getSupplierEsgCsrUrl(),
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Bundle cancel renew failed for ${user.email}:`, err.message);
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

async function sendAiPriceReductionToReceiversAndCustomers({ donation, oldPrice, newPrice }) {
  if (!donation) return;
  try {
    const recipients = await User.find({
      role: { $in: [/^receiver$/i, /^customer$/i] },
      isEmailVerified: true,
      accountStatus: 'active',
    })
      .select('email receiverName username role')
      .lean();

    if (!recipients.length) {
      console.log('[email] No active receiver/customer users to notify for AI discount');
      return;
    }

    const payload = getDonationPayload(donation);
    const findFoodUrl = getReceiverFindFoodUrl();
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      if (!recipient.email) continue;
      try {
        const name = getUserDisplayName(recipient);
        const { subject, html, text } = aiPriceReductionAlertEmail({
          name,
          donation: payload,
          oldPrice,
          newPrice,
          findFoodUrl,
        });
        await sendMail({ to: recipient.email, subject, text, html });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `[email] Failed AI discount alert to ${recipient.email}:`,
          err.message
        );
      }
    }

    console.log(
      `[email] AI discount alerts sent=${sent}, failed=${failed}, total=${recipients.length}`
    );
  } catch (err) {
    console.error('[email] Failed to notify receiver/customer users about AI discount:', err.message);
  }
}

function getDriverEarningsUrl() {
  return `${getFrontendBase()}/driver/earnings`;
}

function getSupplierEarningsUrl() {
  return `${getFrontendBase()}/supplier/earnings`;
}

function getEarningsUrlForUser(user) {
  const role = (user?.role || '').toLowerCase();
  if (role === 'driver') return getDriverEarningsUrl();
  return getSupplierEarningsUrl();
}

async function sendPayoutSubmittedEmail(user, payout) {
  if (!user?.email) return;
  const name = getUserDisplayName(user);
  const tpl = payoutSubmittedEmail({
    name,
    amount: payout.amount,
    currency: payout.currency,
    earningsUrl: getEarningsUrlForUser(user),
  });
  await sendMail({ to: user.email, ...tpl });
}

async function sendPayoutApprovedEmail(user, payout) {
  if (!user?.email) return;
  const name = getUserDisplayName(user);
  const tpl = payoutApprovedEmail({
    name,
    amount: payout.amount,
    currency: payout.currency,
    earningsUrl: getEarningsUrlForUser(user),
    expectedTransferBy: payout.expectedTransferBy
      ? formatTransferDueDate(payout.expectedTransferBy)
      : null,
  });
  await sendMail({ to: user.email, ...tpl });
}

async function sendPayoutRejectedEmail(user, payout) {
  if (!user?.email) return;
  const name = getUserDisplayName(user);
  const tpl = payoutRejectedEmail({
    name,
    amount: payout.amount,
    currency: payout.currency,
    adminNote: payout.adminNote,
    earningsUrl: getEarningsUrlForUser(user),
  });
  await sendMail({ to: user.email, ...tpl });
}

async function sendPayoutPaidEmail(user, payout) {
  if (!user?.email) return;
  const name = getUserDisplayName(user);
  const tpl = payoutPaidEmail({
    name,
    amount: payout.amount,
    currency: payout.currency,
    earningsUrl: getEarningsUrlForUser(user),
  });
  await sendMail({ to: user.email, ...tpl });
}

async function sendPayoutAdminAlertEmail(user, payout) {
  const to = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!to) return;
  const tpl = payoutAdminAlertEmail({
    userName: getUserDisplayName(user),
    userEmail: user.email,
    role: user.role,
    amount: payout.amount,
    currency: payout.currency,
  });
  await sendMail({ to, ...tpl });
}

async function sendMaintenanceAnnouncementEmails({ type, state, previous }) {
  if (!state || !type) return;

  try {
    const users = await User.find({
      isEmailVerified: true,
      accountStatus: 'active',
      email: { $exists: true, $ne: '' },
    })
      .select('email username receiverName driverName businessName role')
      .lean();

    if (!users.length) {
      console.log('[email] No active users to notify about maintenance');
      return;
    }

    const loginUrl = getLoginUrl();
    const isDraining = state.phase === 'sudden_drain';
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      if (!user.email) continue;
      try {
        const name = getUserDisplayName(user);
        let tpl;
        if (type === 'scheduled') {
          tpl = scheduledMaintenanceAnnouncementEmail({
            name,
            loginUrl,
            scheduledMessage: state.scheduledMessage,
            scheduledStart: state.scheduledStart,
            scheduledEnd: state.scheduledEnd,
          });
        } else if (type === 'scheduled_updated' && previous) {
          tpl = scheduledMaintenanceUpdatedEmail({
            name,
            loginUrl,
            scheduledMessage: state.scheduledMessage,
            scheduledStart: state.scheduledStart,
            scheduledEnd: state.scheduledEnd,
            previousMessage: previous.scheduledMessage,
            previousStart: previous.scheduledStart,
            previousEnd: previous.scheduledEnd,
          });
        } else if (type === 'scheduled_started') {
          tpl = scheduledMaintenanceStartedEmail({
            name,
            loginUrl,
            scheduledMessage: state.scheduledMessage,
            scheduledStart: state.scheduledStart,
            scheduledEnd: state.scheduledEnd,
          });
        } else if (type === 'sudden') {
          tpl = suddenMaintenanceAnnouncementEmail({
            name,
            loginUrl,
            suddenStartedAt: state.suddenStartedAt,
            isDraining,
            deliveriesInProgress: state.ongoingCount ?? 0,
          });
        } else {
          continue;
        }
        await sendMail({ to: user.email, ...tpl });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `[email] Failed maintenance announcement to ${user.email}:`,
          err.message
        );
      }
    }

    console.log(
      `[email] Maintenance (${type}) announcements sent=${sent}, failed=${failed}, total=${users.length}`
    );
  } catch (err) {
    console.error('[email] Failed maintenance announcement broadcast:', err.message);
  }
}

function sendScheduledMaintenanceAnnouncementEmails(state) {
  return sendMaintenanceAnnouncementEmails({ type: 'scheduled', state });
}

function sendScheduledMaintenanceUpdatedEmails({ previous, current }) {
  return sendMaintenanceAnnouncementEmails({
    type: 'scheduled_updated',
    state: current,
    previous,
  });
}

async function sendScheduledMaintenanceStartedEmails(state) {
  return sendMaintenanceAnnouncementEmails({ type: 'scheduled_started', state });
}

function sendSuddenMaintenanceAnnouncementEmails(state) {
  return sendMaintenanceAnnouncementEmails({ type: 'sudden', state });
}

function resolveMaintenanceType(payload) {
  if (payload?.maintenanceType) return payload.maintenanceType;
  const phase = payload?.phase || '';
  const mode = payload?.mode || '';
  if (mode === 'scheduled' || phase.startsWith('scheduled_')) return 'scheduled';
  if (mode === 'sudden_drain' || mode === 'sudden_active' || phase.startsWith('sudden_')) {
    return 'sudden';
  }
  return 'scheduled';
}

async function sendMaintenanceCancelledAnnouncementEmails(payload) {
  if (!payload || payload.reason == null) return;

  try {
    const users = await User.find({
      isEmailVerified: true,
      accountStatus: 'active',
      email: { $exists: true, $ne: '' },
    })
      .select('email username receiverName driverName businessName role')
      .lean();

    if (!users.length) {
      console.log('[email] No active users to notify about maintenance cancellation');
      return;
    }

    const loginUrl = getLoginUrl();
    const maintenanceType = resolveMaintenanceType(payload);
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      if (!user.email) continue;
      try {
        const name = getUserDisplayName(user);
        const tpl = maintenanceCancelledEmail({
          name,
          loginUrl,
          maintenanceType,
          reason: payload.reason,
          scheduledStart: payload.scheduledStart,
          scheduledEnd: payload.scheduledEnd,
          scheduledMessage: payload.scheduledMessage,
          suddenStartedAt: payload.suddenStartedAt,
        });
        await sendMail({ to: user.email, ...tpl });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `[email] Failed maintenance cancellation email to ${user.email}:`,
          err.message
        );
      }
    }

    console.log(
      `[email] Maintenance cancelled (${payload.reason}) emails sent=${sent}, failed=${failed}, total=${users.length}`
    );
  } catch (err) {
    console.error('[email] Failed maintenance cancellation broadcast:', err.message);
  }
}

async function sendAdminLoginNotificationEmail(user, { timestamp, device, location }) {
  if (!user?.email) return;
  try {
    const name = getUserDisplayName(user);
    const { subject, html, text } = adminLoginNotificationEmail({
      name,
      email: user.email,
      timestamp,
      device,
      location,
    });
    await sendMail({ to: user.email, subject, text, html });
  } catch (err) {
    console.error(`[email] Failed to send Admin login notification to ${user.email}:`, err.message);
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
  sendDigitalReceiptEmails,
  getSupplierDigitalReceiptUrl,
  getReceiverDigitalReceiptUrl,
  getCustomerDigitalReceiptUrl,
  getDriverDigitalReceiptUrl,
  sendPaymentInvoiceEmail,
  sendSupplierAiSubscriptionPaymentEmail,
  sendSupplierAiAutoRenewCancelledEmail,
  sendSupplierEsgSubscriptionPaymentEmail,
  sendSupplierEsgAutoRenewCancelledEmail,
  sendSupplierBundleSubscriptionPaymentEmail,
  sendSupplierBundleAutoRenewCancelledEmail,
  sendCustomerOrderNewPickupToDrivers,
  sendAiPriceReductionToReceiversAndCustomers,
  sendPayoutSubmittedEmail,
  sendPayoutApprovedEmail,
  sendPayoutRejectedEmail,
  sendPayoutPaidEmail,
  sendPayoutAdminAlertEmail,
  sendScheduledMaintenanceAnnouncementEmails,
  sendScheduledMaintenanceStartedEmails,
  sendScheduledMaintenanceUpdatedEmails,
  sendSuddenMaintenanceAnnouncementEmails,
  sendMaintenanceCancelledAnnouncementEmails,
  sendAdminLoginNotificationEmail,
};
