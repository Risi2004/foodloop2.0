function layoutHtml(title, bodyParagraphs, footer) {
  const paragraphs = bodyParagraphs
    .map((p) => `<p style="color: #444; line-height: 1.5;">${p}</p>`)
    .join('');
  const footerBlock = footer
    ? `<p style="color: #666; font-size: 14px; margin-top: 20px;">${footer}</p>`
    : '';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">${title}</h3>
      ${paragraphs}
      ${footerBlock}
    </div>
  `;
}

function otpEmailHtml(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #333;">${otp}</p>
      <p style="color: #666;">This code expires in 10 minutes. If you did not sign up, ignore this email.</p>
    </div>
  `;
}

function otpEmailText(otp) {
  return `Your FoodLoop verification code is: ${otp}. It expires in 10 minutes.`;
}

function passwordResetOtpEmailHtml(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <p>Your password reset code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #333;">${otp}</p>
      <p style="color: #666;">This code expires in 10 minutes. If you did not request a password reset, ignore this email.</p>
    </div>
  `;
}

function passwordResetOtpEmail({ name, otp }) {
  const html = passwordResetOtpEmailHtml(otp);
  const text = `Hello ${name},\n\nYour FoodLoop password reset code is: ${otp}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`;
  return {
    subject: 'FoodLoop — Password reset code',
    html,
    text,
  };
}

function passwordChangedEmail({ name, loginUrl }) {
  const html = layoutHtml(
    'Your password was changed',
    [
      `Hello ${name},`,
      'Your FoodLoop account password was changed successfully.',
      'If you made this change, you can sign in with your new password.',
      `Sign in here: <a href="${loginUrl}" style="color: #4CAF50;">${loginUrl}</a>`,
      'If you did not change your password, contact support immediately.',
    ],
    'Thank you for using FoodLoop.'
  );
  const text = `Hello ${name},\n\nYour FoodLoop account password was changed successfully.\n\nSign in: ${loginUrl}\n\nIf you did not change your password, contact support immediately.\n\nThank you for using FoodLoop.`;
  return {
    subject: 'FoodLoop — Your password was changed',
    html,
    text,
  };
}

function accountCreatedEmail({ name, loginUrl }) {
  const html = layoutHtml(
    'Your account is ready',
    [
      `Hello ${name},`,
      'Your email has been verified and your FoodLoop account is now active.',
      `You can sign in here: <a href="${loginUrl}" style="color: #4CAF50;">${loginUrl}</a>`,
    ],
    'Thank you for joining FoodLoop.'
  );
  const text = `Hello ${name},\n\nYour email has been verified and your FoodLoop account is now active.\n\nSign in: ${loginUrl}\n\nThank you for joining FoodLoop.`;
  return {
    subject: 'FoodLoop — Your account is ready',
    html,
    text,
  };
}

function pendingApprovalEmail({ name, loginUrl }) {
  const html = layoutHtml(
    'Account pending administrator approval',
    [
      `Hello ${name},`,
      'Your email has been verified successfully.',
      '<strong>Administrator review required.</strong> A FoodLoop administrator must approve your account before you can sign in. After approval, you will receive another email and can log in.',
      `Login page (available after approval): <a href="${loginUrl}" style="color: #4CAF50;">${loginUrl}</a>`,
    ],
    'We will notify you by email once your account has been reviewed.'
  );
  const text = `Hello ${name},\n\nYour email has been verified successfully.\n\nAdministrator review required. A FoodLoop admin must approve your account before you can sign in. After approval, you will receive another email and can log in.\n\nLogin page (after approval): ${loginUrl}\n\nWe will notify you by email once your account has been reviewed.`;
  return {
    subject: 'FoodLoop — Account pending administrator approval',
    html,
    text,
  };
}

function accountApprovedEmail({ name, loginUrl }) {
  const html = layoutHtml(
    'Your account has been approved',
    [
      `Hello ${name},`,
      'Good news — a FoodLoop administrator has approved your registration.',
      'Your account is now active. You can sign in and start using FoodLoop.',
      `Sign in here: <a href="${loginUrl}" style="color: #4CAF50;">${loginUrl}</a>`,
    ],
    'Thank you for your patience.'
  );
  const text = `Hello ${name},\n\nA FoodLoop administrator has approved your registration. Your account is now active.\n\nSign in: ${loginUrl}\n\nThank you for your patience.`;
  return {
    subject: 'FoodLoop — Your account has been approved',
    html,
    text,
  };
}

function accountReactivatedEmail({ name, loginUrl }) {
  const html = layoutHtml(
    'Your account has been reactivated',
    [
      `Hello ${name},`,
      'Good news — a FoodLoop administrator has reactivated your account.',
      'You can sign in again and continue using FoodLoop.',
      `Sign in here: <a href="${loginUrl}" style="color: #4CAF50;">${loginUrl}</a>`,
    ],
    'Thank you for being part of FoodLoop.'
  );
  const text = `Hello ${name},\n\nA FoodLoop administrator has reactivated your account.\n\nYou can sign in again: ${loginUrl}\n\nThank you for being part of FoodLoop.`;
  return {
    subject: 'FoodLoop — Your account has been reactivated',
    html,
    text,
  };
}

function accountDeactivatedEmail({ name, loginUrl }) {
  const html = layoutHtml(
    'Your account has been deactivated',
    [
      `Hello ${name},`,
      'A FoodLoop administrator has deactivated your account.',
      'You will not be able to sign in until an administrator reactivates your account.',
      'If you have questions, please contact our support team.',
      `FoodLoop login page: <a href="${loginUrl}" style="color: #4CAF50;">${loginUrl}</a>`,
    ],
    'Thank you for being part of FoodLoop.'
  );
  const text = `Hello ${name},\n\nA FoodLoop administrator has deactivated your account.\n\nYou will not be able to sign in until an administrator reactivates your account.\n\nIf you have questions, please contact our support team.\n\nLogin page: ${loginUrl}\n\nThank you for being part of FoodLoop.`;
  return {
    subject: 'FoodLoop — Your account has been deactivated',
    html,
    text,
  };
}

function formatDonationListingType(listingType) {
  return (listingType || 'donate').toLowerCase() === 'sell' ? 'Sell (paid)' : 'Donate (free)';
}

function formatDonationPrice(donation) {
  const currency = donation.priceCurrency || 'LKR';
  const raw = donation.priceAmount;
  const amount =
    raw != null && !Number.isNaN(Number(raw)) ? Math.max(0, Number(raw)) : 0;
  return `${currency} ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDonationQualityScore(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return `${Math.round(Number(score) * 100)}%`;
}

function buildDonationDetailRows(donation, extraRows = [], options = {}) {
  const { includeTrackingId = true } = options;
  const d = donation;
  const detectedItems =
    Array.isArray(d.aiDetectedItems) && d.aiDetectedItems.length > 0
      ? d.aiDetectedItems.join(', ')
      : '—';
  const pickupWindow = `${d.preferredPickupDate || '—'}, ${d.preferredPickupTimeFrom || '—'} – ${d.preferredPickupTimeTo || '—'}`;
  const expiry = d.userProvidedExpiryDate || d.expiryDate || '—';

  const trackingRow = includeTrackingId ? [['Tracking ID', d.trackingId || '—']] : [];

  return [
    ...extraRows,
    ...trackingRow,
    ['Item', d.itemName || '—'],
    ['Category', d.foodCategory || '—'],
    ['Quantity', d.quantity != null ? String(d.quantity) : '—'],
    ['Listing type', formatDonationListingType(d.listingType)],
    ['Price', formatDonationPrice(d)],
    ['Expiry date', expiry],
    ['Storage', d.storageRecommendation || '—'],
    ['Pickup address', d.pickupAddress || '—'],
    ['Pickup window', pickupWindow],
    ['Status', d.status || 'available'],
    ['AI freshness', d.aiFreshness || '—'],
    ['AI quality score', formatDonationQualityScore(d.aiQualityScore)],
    ['AI detected items', detectedItems],
    ['Product type', d.productType || '—'],
  ];
}

function donationDetailsTableHtml(rows) {
  return rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #666; font-weight: 600; vertical-align: top; width: 38%;">${label}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #333;">${value}</td>
        </tr>`
    )
    .join('');
}

function donationImageHtml(donation) {
  const d = donation;
  if (!d.imageUrl) return '';
  return `<p style="margin: 16px 0;"><img src="${d.imageUrl}" alt="${d.itemName || 'Food'}" style="max-width: 100%; border-radius: 8px; max-height: 200px; object-fit: cover;" /></p>`;
}

function donationPostedEmail({ name, donation, myDonationsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(d);
  const tableRows = donationDetailsTableHtml(rows);
  const imageBlock = donationImageHtml(d);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Your food listing is live</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">Thank you for posting on FoodLoop. Your donation has been published and is now visible to receivers. Here are the details:</p>
      ${imageBlock}
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        Manage your listings: <a href="${myDonationsUrl}" style="color: #4CAF50;">${myDonationsUrl}</a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">Thank you for helping reduce food waste.</p>
    </div>
  `;

  const textLines = [
    `Hello ${name},`,
    '',
    'Your food listing is live on FoodLoop. Details:',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Manage listings: ${myDonationsUrl}`,
    '',
    'Thank you for helping reduce food waste.',
  ];

  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return {
    subject: `FoodLoop — Your listing is live${itemLabel}`,
    html,
    text: textLines.join('\n'),
  };
}

function newDonationAvailableEmail({ name, donation, donorName, findFoodUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(d, [['Posted by', donorName || '—']], {
    includeTrackingId: false,
  });
  const tableRows = donationDetailsTableHtml(rows);
  const imageBlock = donationImageHtml(d);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">New food available near you</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">A donor has posted new surplus food on FoodLoop. You can view and claim it from Find Food. Details:</p>
      ${imageBlock}
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        Browse available food: <a href="${findFoodUrl}" style="color: #4CAF50;">${findFoodUrl}</a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">Thank you for helping reduce food waste.</p>
    </div>
  `;

  const textLines = [
    `Hello ${name},`,
    '',
    'New surplus food is available on FoodLoop. Details:',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Browse food: ${findFoodUrl}`,
    '',
    'Thank you for helping reduce food waste.',
  ];

  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return {
    subject: `FoodLoop — New food available${itemLabel}`,
    html,
    text: textLines.join('\n'),
  };
}

function donationClaimedDonorEmail({ name, donation, receiverName, myDonationsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(d, [['Claimed by', receiverName || '—']]);
  const tableRows = donationDetailsTableHtml(rows);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Your listing was claimed</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">A receiver has claimed your food listing. It is now <strong>looking for a driver</strong> for pickup and delivery.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        View your donations: <a href="${myDonationsUrl}" style="color: #4CAF50;">${myDonationsUrl}</a>
      </p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    '',
    `Your listing "${d.itemName || 'Food'}" was claimed by ${receiverName || 'a receiver'}.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `View donations: ${myDonationsUrl}`,
  ].join('\n');

  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return {
    subject: `FoodLoop — Your listing was claimed${itemLabel}`,
    html,
    text,
  };
}

function donationClaimedReceiverEmail({ name, donation, myClaimsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(
    d,
    [
      ['Delivery address', d.receiverAddress || '—'],
      ['Donor', d.donorName || '—'],
    ],
    { includeTrackingId: false }
  );
  const tableRows = donationDetailsTableHtml(rows);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Claim confirmed</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">You have successfully claimed this food listing. We are now looking for a driver to complete pickup and delivery.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        Track your claims: <a href="${myClaimsUrl}" style="color: #4CAF50;">${myClaimsUrl}</a>
      </p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    '',
    `You claimed "${d.itemName || 'Food'}".`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `My claims: ${myClaimsUrl}`,
  ].join('\n');

  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return {
    subject: `FoodLoop — Claim confirmed${itemLabel}`,
    html,
    text,
  };
}

function donationClaimCancelledDonorEmail({ name, donation, receiverName, myDonationsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(d, [
    ['Previously claimed by', receiverName || '—'],
    ['Note', 'The claim was cancelled before a driver was assigned. Your listing is available for receivers again.'],
  ]);
  const tableRows = donationDetailsTableHtml(rows);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Claim cancelled</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">The claim on your food listing was cancelled before driver pickup. Your listing is back to <strong>looking for a receiver</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        View your donations: <a href="${myDonationsUrl}" style="color: #4CAF50;">${myDonationsUrl}</a>
      </p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    '',
    `The claim on "${d.itemName || 'Food'}" was cancelled before driver pickup.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `View donations: ${myDonationsUrl}`,
  ].join('\n');

  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return {
    subject: `FoodLoop — Claim cancelled on your listing${itemLabel}`,
    html,
    text,
  };
}

function donationClaimCancelledReceiverEmail({ name, donation, myClaimsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(d, [
    ['Note', 'You cancelled this claim before a driver was assigned.'],
  ], { includeTrackingId: false });
  const tableRows = donationDetailsTableHtml(rows);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Claim cancelled</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">Your claim has been cancelled. This listing is no longer reserved for you.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        Browse food: <a href="${myClaimsUrl}" style="color: #4CAF50;">${myClaimsUrl}</a>
      </p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    '',
    `You cancelled your claim on "${d.itemName || 'Food'}".`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `My claims: ${myClaimsUrl}`,
  ].join('\n');

  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return {
    subject: `FoodLoop — Your claim was cancelled${itemLabel}`,
    html,
    text,
  };
}

function donationNewPickupDriverEmail({ name, donation, driverPickupsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(
    d,
    [['Pickup address', d.pickupAddress || d.donorAddress || '—']],
    { includeTrackingId: false }
  );
  const tableRows = donationDetailsTableHtml(rows);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">New pickup available</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">A food listing has been claimed and is ready for driver pickup. Details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        View pickups: <a href="${driverPickupsUrl}" style="color: #4CAF50;">${driverPickupsUrl}</a>
      </p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    '',
    `New pickup available: ${d.itemName || 'Food'}.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Driver pickups: ${driverPickupsUrl}`,
  ].join('\n');

  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return {
    subject: `FoodLoop — New pickup available${itemLabel}`,
    html,
    text,
  };
}

function donationDriverAssignedDonorEmail({
  name,
  donation,
  driverName,
  receiverName,
  trackOrderUrl,
  myDonationsUrl,
}) {
  const d = donation;
  const rows = buildDonationDetailRows(d, [
    ['Driver', driverName || '—'],
    ['Delivering to', receiverName || '—'],
    ['Status', 'Driver assigned — on the way to pickup'],
  ]);
  const tableRows = donationDetailsTableHtml(rows);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">A driver accepted your order</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">A driver has accepted your food listing and is heading to your pickup location.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><tbody>${tableRows}</tbody></table>
      <p style="color: #444; line-height: 1.5;">Track live progress: <a href="${trackOrderUrl}" style="color: #4CAF50;">${trackOrderUrl}</a></p>
      <p style="color: #444; line-height: 1.5;">My donations: <a href="${myDonationsUrl}" style="color: #4CAF50;">${myDonationsUrl}</a></p>
    </div>`;
  const text = [
    `Hello ${name},`,
    '',
    `A driver (${driverName || 'assigned'}) accepted your listing "${d.itemName || 'Food'}" and is on the way to pickup.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Track: ${trackOrderUrl}`,
  ].join('\n');
  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return { subject: `FoodLoop — Driver assigned to your order${itemLabel}`, html, text };
}

function donationDriverAssignedReceiverEmail({
  name,
  donation,
  driverName,
  trackOrderUrl,
  myClaimsUrl,
}) {
  const d = donation;
  const rows = buildDonationDetailRows(
    d,
    [
      ['Driver', driverName || '—'],
      ['Your delivery address', d.receiverAddress || '—'],
      ['Status', 'Driver assigned — heading to donor for pickup'],
    ],
    { includeTrackingId: false }
  );
  const tableRows = donationDetailsTableHtml(rows);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Driver assigned to your order</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">A driver has accepted the food you claimed and will pick it up from the donor soon.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><tbody>${tableRows}</tbody></table>
      <p style="color: #444; line-height: 1.5;">Track delivery: <a href="${trackOrderUrl}" style="color: #4CAF50;">${trackOrderUrl}</a></p>
      <p style="color: #444; line-height: 1.5;">My claims: <a href="${myClaimsUrl}" style="color: #4CAF50;">${myClaimsUrl}</a></p>
    </div>`;
  const text = [
    `Hello ${name},`,
    '',
    `Driver ${driverName || 'assigned'} is handling your order "${d.itemName || 'Food'}".`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Track: ${trackOrderUrl}`,
  ].join('\n');
  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return { subject: `FoodLoop — Driver assigned to your claim${itemLabel}`, html, text };
}

function donationDriverAssignedDriverEmail({ name, donation, donorName, receiverName, pickupUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(
    d,
    [
      ['Pickup from', donorName || '—'],
      ['Deliver to', receiverName || '—'],
      ['Pickup address', d.pickupAddress || '—'],
    ],
    { includeTrackingId: false }
  );
  const tableRows = donationDetailsTableHtml(rows);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Order accepted — start pickup</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">You have accepted this delivery. Head to the donor for pickup, then deliver to the receiver.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><tbody>${tableRows}</tbody></table>
      <p style="color: #444; line-height: 1.5;">Open pickup &amp; map: <a href="${pickupUrl}" style="color: #4CAF50;">${pickupUrl}</a></p>
    </div>`;
  const text = [
    `Hello ${name},`,
    '',
    `You accepted "${d.itemName || 'Food'}". Pickup from ${donorName || 'donor'}, deliver to ${receiverName || 'receiver'}.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Pickup page: ${pickupUrl}`,
  ].join('\n');
  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return { subject: `FoodLoop — Order details for pickup${itemLabel}`, html, text };
}

function donationPickupConfirmedDonorEmail({ name, donation, driverName, trackOrderUrl, myDonationsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(d, [
    ['Driver', driverName || '—'],
    ['Status', 'Picked up — on the way to receiver'],
  ]);
  const tableRows = donationDetailsTableHtml(rows);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Pickup confirmed</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">The driver has picked up your food and is now delivering it to the receiver.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><tbody>${tableRows}</tbody></table>
      <p style="color: #444; line-height: 1.5;">Track: <a href="${trackOrderUrl}" style="color: #4CAF50;">${trackOrderUrl}</a></p>
      <p style="color: #444; line-height: 1.5;">My donations: <a href="${myDonationsUrl}" style="color: #4CAF50;">${myDonationsUrl}</a></p>
    </div>`;
  const text = [
    `Hello ${name},`,
    '',
    `Pickup confirmed for "${d.itemName || 'Food'}". Driver ${driverName || ''} is en route to the receiver.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Track: ${trackOrderUrl}`,
  ].join('\n');
  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return { subject: `FoodLoop — Pickup confirmed${itemLabel}`, html, text };
}

function donationPickupConfirmedReceiverEmail({ name, donation, driverName, trackOrderUrl, myClaimsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(
    d,
    [
      ['Driver', driverName || '—'],
      ['Status', 'Picked up — on the way to you'],
    ],
    { includeTrackingId: false }
  );
  const tableRows = donationDetailsTableHtml(rows);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Your food is on the way</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">The driver has picked up your order and is heading to your delivery address.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><tbody>${tableRows}</tbody></table>
      <p style="color: #444; line-height: 1.5;">Track: <a href="${trackOrderUrl}" style="color: #4CAF50;">${trackOrderUrl}</a></p>
      <p style="color: #444; line-height: 1.5;">My claims: <a href="${myClaimsUrl}" style="color: #4CAF50;">${myClaimsUrl}</a></p>
    </div>`;
  const text = [
    `Hello ${name},`,
    '',
    `Your order "${d.itemName || 'Food'}" was picked up. Driver ${driverName || ''} is on the way.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `Track: ${trackOrderUrl}`,
  ].join('\n');
  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return { subject: `FoodLoop — Your order is on the way${itemLabel}`, html, text };
}

function donationDeliveredDonorEmail({ name, donation, driverName, receiverName, myDonationsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(d, [
    ['Driver', driverName || '—'],
    ['Delivered to', receiverName || '—'],
    ['Status', 'Delivered'],
  ]);
  const tableRows = donationDetailsTableHtml(rows);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Delivery completed</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">Your food listing has been successfully delivered to the receiver. Thank you for reducing food waste with FoodLoop.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><tbody>${tableRows}</tbody></table>
      <p style="color: #444; line-height: 1.5;">My donations: <a href="${myDonationsUrl}" style="color: #4CAF50;">${myDonationsUrl}</a></p>
    </div>`;
  const text = [
    `Hello ${name},`,
    '',
    `"${d.itemName || 'Food'}" was delivered to ${receiverName || 'the receiver'}.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `My donations: ${myDonationsUrl}`,
  ].join('\n');
  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return { subject: `FoodLoop — Delivery completed${itemLabel}`, html, text };
}

function donationDeliveredReceiverEmail({ name, donation, driverName, myClaimsUrl }) {
  const d = donation;
  const rows = buildDonationDetailRows(
    d,
    [
      ['Driver', driverName || '—'],
      ['Status', 'Delivered'],
    ],
    { includeTrackingId: false }
  );
  const tableRows = donationDetailsTableHtml(rows);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Delivery completed</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">Your claimed food has been delivered. Thank you for using FoodLoop.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><tbody>${tableRows}</tbody></table>
      <p style="color: #444; line-height: 1.5;">My claims: <a href="${myClaimsUrl}" style="color: #4CAF50;">${myClaimsUrl}</a></p>
    </div>`;
  const text = [
    `Hello ${name},`,
    '',
    `Your order "${d.itemName || 'Food'}" was delivered.`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `My claims: ${myClaimsUrl}`,
  ].join('\n');
  const itemLabel = d.itemName ? ` — ${d.itemName}` : '';
  return { subject: `FoodLoop — Your order was delivered${itemLabel}`, html, text };
}

function accountRejectedEmail({ name }) {
  const html = layoutHtml(
    'Registration update',
    [
      `Hello ${name},`,
      'Thank you for registering with FoodLoop.',
      'After review, we were unable to approve your registration at this time.',
      'If you believe this was a mistake or would like more information, please contact our support team.',
    ],
    'Thank you for your interest in FoodLoop.'
  );
  const text = `Hello ${name},\n\nThank you for registering with FoodLoop.\n\nAfter review, we were unable to approve your registration at this time.\n\nIf you believe this was a mistake, please contact our support team.\n\nThank you for your interest in FoodLoop.`;
  return {
    subject: 'FoodLoop — Registration update',
    html,
    text,
  };
}

function formatInvoiceDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Colombo',
  });
}

function paymentInvoiceEmail({
  name,
  orderId,
  paidAt,
  itemName,
  amount,
  currency,
  cardLast4,
  myClaimsUrl,
}) {
  const currencyLabel = currency || 'LKR';
  const amountFormatted = `${currencyLabel} ${Number(amount).toLocaleString('en-LK')}`;
  const cardDisplay = cardLast4 ? `•••• •••• •••• ${cardLast4}` : 'Card on file';
  const paidAtFormatted = formatInvoiceDate(paidAt);

  const rows = [
    ['Invoice #', orderId],
    ['Date paid', paidAtFormatted],
    ['Item', itemName || 'Food listing'],
    ['Amount', amountFormatted],
    ['Payment method', cardDisplay],
    ['Status', 'Paid'],
  ];
  const tableRows = donationDetailsTableHtml(rows);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">FoodLoop</h2>
      <h3 style="color: #1F4E36; margin-bottom: 12px;">Payment receipt</h3>
      <p style="color: #444; line-height: 1.5;">Hello ${name},</p>
      <p style="color: #444; line-height: 1.5;">Thank you for your payment. This is your invoice for the food listing purchase (demo payment — no real charge was made).</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #444; line-height: 1.5;">
        Complete your claim by setting your delivery location, then track your order:
        <a href="${myClaimsUrl}" style="color: #4CAF50;">${myClaimsUrl}</a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">Keep this email for your records.</p>
    </div>
  `;

  const text = [
    `Hello ${name},`,
    '',
    'Thank you for your payment. Here is your invoice (demo payment — no real charge).',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `My claims: ${myClaimsUrl}`,
    '',
    'Keep this email for your records.',
  ].join('\n');

  const itemLabel = itemName ? ` — ${itemName}` : '';
  return {
    subject: `FoodLoop — Payment receipt${itemLabel}`,
    html,
    text,
  };
}

module.exports = {
  otpEmailHtml,
  otpEmailText,
  paymentInvoiceEmail,
  donationPostedEmail,
  newDonationAvailableEmail,
  accountCreatedEmail,
  pendingApprovalEmail,
  accountApprovedEmail,
  accountRejectedEmail,
  accountDeactivatedEmail,
  accountReactivatedEmail,
  passwordResetOtpEmail,
  passwordChangedEmail,
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
};
