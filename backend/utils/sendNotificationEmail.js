const { sendMail } = require('../config/mailer');
const {
  accountCreatedEmail,
  pendingApprovalEmail,
  accountApprovedEmail,
  accountRejectedEmail,
  accountDeactivatedEmail,
  accountReactivatedEmail,
  passwordResetOtpEmail,
  passwordChangedEmail,
} = require('./emailTemplates');

function getLoginUrl() {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/login`;
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

module.exports = {
  getLoginUrl,
  getUserDisplayName,
  sendAccountCreatedEmail,
  sendPendingApprovalEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail,
};
