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

module.exports = {
  otpEmailHtml,
  otpEmailText,
  accountCreatedEmail,
  pendingApprovalEmail,
  accountApprovedEmail,
  accountRejectedEmail,
  accountDeactivatedEmail,
  accountReactivatedEmail,
  passwordResetOtpEmail,
  passwordChangedEmail,
};
