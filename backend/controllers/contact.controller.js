const jwt = require('jsonwebtoken');
const ContactMessage = require('../models/ContactMessage');
const User = require('../models/User');
const {
  sendContactConfirmationEmail,
  sendContactReplyEmail,
} = require('../utils/sendNotificationEmail');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveOptionalUserId(req) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).select('_id accountStatus');
    if (!user || user.accountStatus === 'deactivated') return null;
    return user._id;
  } catch {
    return null;
  }
}

async function submitContact(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const contactNo = String(req.body?.contactNo || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    const sourcePage = String(req.body?.sourcePage || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }
    if (name.length > 120 || email.length > 254 || contactNo.length > 30 || subject.length > 200 || message.length > 5000) {
      return res.status(400).json({ success: false, message: 'One or more fields exceed the maximum length.' });
    }

    const userId = await resolveOptionalUserId(req);

    const doc = await ContactMessage.create({
      name,
      email,
      contactNo,
      subject,
      message,
      sourcePage,
      userId,
      status: 'pending',
    });

    sendContactConfirmationEmail({
      name,
      email,
      subject: subject || 'General inquiry',
    }).catch((err) => {
      console.error(`[email] Failed to send contact confirmation to ${email}:`, err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Your message has been received. We will contact you within 2 working days.',
      id: doc._id.toString(),
    });
  } catch (err) {
    console.error('[contact] submitContact error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit contact message.' });
  }
}

async function listContactMessages(req, res) {
  try {
    const docs = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({
      success: true,
      messages: docs.map((doc) => doc.toListJSON()),
    });
  } catch (err) {
    console.error('[contact] listContactMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load contact messages.' });
  }
}

async function replyToContactMessage(req, res) {
  try {
    const { id } = req.params;
    const reply = String(req.body?.reply || '').trim();

    if (!reply) {
      return res.status(400).json({ success: false, message: 'Reply text is required.' });
    }
    if (reply.length > 5000) {
      return res.status(400).json({ success: false, message: 'Reply exceeds the maximum length.' });
    }

    const doc = await ContactMessage.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Contact message not found.' });
    }
    if (doc.status === 'replied') {
      return res.status(409).json({ success: false, message: 'This message has already been replied to.' });
    }

    try {
      await sendContactReplyEmail({
        name: doc.name,
        email: doc.email,
        subject: doc.subject || 'General inquiry',
        originalMessage: doc.message,
        adminReply: reply,
      });
    } catch (emailErr) {
      console.error(`[email] Failed to send contact reply to ${doc.email}:`, emailErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reply email. Please try again.',
      });
    }

    doc.adminReply = reply;
    doc.repliedAt = new Date();
    doc.repliedBy = req.user?._id || null;
    doc.status = 'replied';
    await doc.save();

    return res.json({ success: true, message: 'Reply sent by email.' });
  } catch (err) {
    console.error('[contact] replyToContactMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send reply.' });
  }
}

module.exports = {
  submitContact,
  listContactMessages,
  replyToContactMessage,
};
