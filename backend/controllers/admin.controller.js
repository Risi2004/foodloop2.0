const User = require('../models/User');
const { SUPPLIER_ROLES } = require('../utils/earningsHelpers');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  listAllOrders,
  getOrderDetail,
  getUserMonitoringList,
} = require('../services/adminOrdersService');
const {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
} = require('../utils/sendNotificationEmail');
function fileUrl(req, relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${relativePath.startsWith('/') ? '' : '/'}${relativePath.replace(/\\/g, '/')}`;
}

function normalizeRoleForAdmin(role) {
  const r = (role || '').toLowerCase();
  if (r === 'receiver') return 'Receiver';
  if (r === 'driver') return 'Driver';
  if (r === 'admin') return 'Admin';
  if (r === 'donor') return 'Donor';
  return role;
}

function mapAccountStatusForFrontend(accountStatus) {
  if (accountStatus === 'active') return 'completed';
  if (accountStatus === 'deactivated') return 'inactive';
  if (accountStatus === 'rejected') return 'rejected';
  if (accountStatus === 'pending_approval') return 'pending';
  if (accountStatus === 'pending_verification') return 'unverified';
  return accountStatus;
}

function formatAdminUser(req, user) {
  const safe = user.toSafeJSON();
  safe.role = normalizeRoleForAdmin(safe.role);
  safe.accountStatus = safe.accountStatus || 'pending_verification';
  safe.status = mapAccountStatusForFrontend(safe.accountStatus);

  if (safe.profileImage) safe.profileImageUrl = fileUrl(req, safe.profileImage);
  if (safe.businessRegFile) safe.businessRegFileUrl = fileUrl(req, safe.businessRegFile);
  if (safe.addressProofFile) safe.addressProofFileUrl = fileUrl(req, safe.addressProofFile);
  if (safe.nicFile) safe.nicFileUrl = fileUrl(req, safe.nicFile);
  if (safe.licenseFile) safe.licenseFileUrl = fileUrl(req, safe.licenseFile);
  if (safe.gramaNiladhariLetter) {
    safe.gramaNiladhariLetterUrl = fileUrl(req, safe.gramaNiladhariLetter);
  }

  return safe;
}

function mapStatusToDb(frontendStatus) {
  const s = (frontendStatus || '').toLowerCase();
  if (s === 'completed' || s === 'active') return 'active';
  if (s === 'rejected') return 'rejected';
  if (s === 'inactive' || s === 'deactivated') return 'deactivated';
  return null;
}

exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      accountStatus: 'pending_approval',
      isEmailVerified: true,
    })
      .sort({ createdAt: -1 })
      .lean(false);

    return res.json({
      success: true,
      users: users.map((u) => formatAdminUser(req, u)),
    });
  } catch (err) {
    console.error('getPendingUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load pending users' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [suppliers, receivers, drivers] = await Promise.all([
      User.countDocuments({ role: { $in: SUPPLIER_ROLES }, accountStatus: 'active' }),
      User.countDocuments({ role: { $in: ['receiver', 'customer'] }, accountStatus: 'active' }),
      User.countDocuments({ role: 'driver', accountStatus: 'active' }),
    ]);

    return res.json({
      success: true,
      stats: { suppliers, receivers, drivers, donors: suppliers },
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const query = { role: { $ne: 'Admin' } };

    if (role) {
      const r = String(role).trim();
      if (r === 'Receiver') query.role = 'receiver';
      else if (r === 'Driver') query.role = 'driver';
      else if (r === 'Donor') query.role = 'Donor';
      else query.role = r.toLowerCase();
    }

    const statusMap = {
      completed: 'active',
      inactive: 'deactivated',
      rejected: 'rejected',
      pending: 'pending_approval',
      unverified: 'pending_verification',
    };
    if (status && statusMap[status]) {
      query.accountStatus = statusMap[status];
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { email: regex },
        { username: regex },
        { businessName: regex },
        { receiverName: regex },
        { driverName: regex },
        { contactNo: regex },
        { address: regex },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return res.json({
      success: true,
      users: users.map((u) => formatAdminUser(req, u)),
    });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const dbStatus = mapStatusToDb(status);
    if (!dbStatus) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use completed, rejected, or inactive.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (dbStatus === 'active') {
      if (!['pending_approval', 'deactivated', 'rejected'].includes(user.accountStatus)) {
        return res.status(400).json({
          success: false,
          message: 'This account cannot be activated from its current status',
        });
      }
      const wasPending = user.accountStatus === 'pending_approval';
      const wasDeactivated = user.accountStatus === 'deactivated';
      const wasRejected = user.accountStatus === 'rejected';
      user.accountStatus = 'active';
      await user.save();
      if (wasPending || wasRejected) {
        await sendAccountApprovedEmail(user);
      } else if (wasDeactivated) {
        await sendAccountReactivatedEmail(user);
      }
    } else if (dbStatus === 'rejected') {
      if (user.accountStatus !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Only pending approval accounts can be rejected',
        });
      }
      user.accountStatus = 'rejected';
      await user.save();
      await sendAccountRejectedEmail(user);
    } else if (dbStatus === 'deactivated') {
      const wasActive = user.accountStatus === 'active';
      user.accountStatus = 'deactivated';
      await user.save();
      if (wasActive) {
        await sendAccountDeactivatedEmail(user);
      }
    } else {
      await user.save();
    }

    return res.json({
      success: true,
      message: 'User status updated',
      user: formatAdminUser(req, user),
    });
  } catch (err) {
    console.error('updateUserStatus error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { type, status, search, page, limit, dateFrom, dateTo } = req.query;
    const result = await listAllOrders({ type, status, search, page, limit, dateFrom, dateTo });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getAllOrders error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load orders',
    });
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const { orderType, id } = req.params;
    const order = await getOrderDetail(orderType, id);
    return res.json({ success: true, order });
  } catch (err) {
    console.error('getOrderDetail error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load order detail',
    });
  }
};

exports.getUserMonitoring = async (req, res) => {
  try {
    const { search, role, status, page, limit } = req.query;
    const result = await getUserMonitoringList({ search, role, status, page, limit });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getUserMonitoring error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load user monitoring data',
    });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status, search, page, limit, dateFrom, dateTo } = req.query;
    const result = await listAllOrders({
      type,
      status,
      search,
      page,
      limit,
      dateFrom,
      dateTo,
      userId: id,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('getUserOrders error:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to load user orders',
    });
  }
};

// --- AI Document Verification Co-Pilot ---

function getMimeFromFilename(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function getFileBase64(req, filePath) {
  if (!filePath) return null;
  const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
  
  let buffer;
  let mimeType;
  
  try {
    if (isUrl) {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type');
      mimeType = contentType || getMimeFromFilename(filePath);
    } else {
      const cleanPath = filePath.replace(/^\/?uploads\//, '');
      const absolutePath = path.join(__dirname, '..', 'uploads', cleanPath);
      if (fs.existsSync(absolutePath)) {
        buffer = fs.readFileSync(absolutePath);
        mimeType = getMimeFromFilename(filePath);
      } else {
        const absoluteUrl = fileUrl(req, filePath);
        if (absoluteUrl) {
          const response = await fetch(absoluteUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get('content-type');
            mimeType = contentType || getMimeFromFilename(filePath);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[aiVerifyUser] Failed to download or read file ${filePath}:`, err);
    return null;
  }
  
  if (!buffer) return null;
  return {
    inlineData: {
      mimeType,
      data: buffer.toString('base64'),
    }
  };
}

exports.aiVerifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI Document Verification is not configured on the server. Please set GEMINI_API_KEY.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Collect all documents uploaded on document fields
    const docFields = [
      { field: 'nicFile', label: 'National Identity Card' },
      { field: 'businessRegFile', label: 'Business Registration Document' },
      { field: 'licenseFile', label: 'Driver\'s License' },
      { field: 'gramaNiladhariLetter', label: 'Grama Niladhari Verification Letter' },
      { field: 'addressProofFile', label: 'Proof of Address' }
    ];

    const inlineDocuments = [];
    for (const { field, label } of docFields) {
      const fieldValue = user[field];
      if (fieldValue) {
        const resolvedPath = fieldValue.startsWith('http') ? fieldValue : fileUrl(req, fieldValue);
        const docPayload = await getFileBase64(req, resolvedPath);
        if (docPayload) {
          inlineDocuments.push({
            label,
            payload: docPayload
          });
        }
      }
    }

    if (inlineDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This user has not uploaded any documents for verification.',
      });
    }

    // Prepare multimodal contents array for Gemini
    const geminiContents = [
      {
        text: `Analyze the uploaded registration documents for a new user registration on the FoodLoop surplus food sharing app.
        
User Profile Details:
- Name: ${user.username || user.businessName || user.driverName || user.receiverName || 'N/A'}
- Email: ${user.email}
- Contact Number: ${user.contactNo}
- Address: ${user.address}
- Role Type: ${user.role}
${user.nicNumber ? `- Provided NIC Number: ${user.nicNumber}` : ''}
${user.businessName ? `- Provided Business Name: ${user.businessName}` : ''}
${user.receiverType ? `- Provided Organization Type: ${user.receiverType}` : ''}
${user.vehicleNumber ? `- Provided Vehicle Number: ${user.vehicleNumber} (${user.vehicleType})` : ''}

You are provided with one or more documents (such as Business Registrations, Driver's Licenses, Grama Niladhari Letters, NICs, or Address Proofs).

Please perform the following operations:
1. Thoroughly read each document and extract key details (like names, numbers, validity dates, registration stamps).
2. Summarize each document in a clean, human-readable paragraph.
3. Compare the document contents against the User Profile Details above.
4. Tell the admin whether to APPROVE or REJECT the registration.
   - APPROVE: Only if the documents are legible, authentic, and verify the user's details/claims (e.g. business registration name matches, driver's license is valid and name matches).
   - REJECT: If details mismatch, documents are expired, illegible, or incomplete.
5. Provide a clear, detailed bulleted list of reasons if rejecting, or a summary explanation if approving.

Return your response strictly in valid JSON format with the following keys (no markdown blocks, no enclosing backticks, just raw JSON text):
{
  "summary": "Clean overall summary of the documents and verification findings",
  "decision": "approve" or "reject",
  "reason": "Detailed bulleted list of reasons for rejection or clear explanation for approval"
}`
      }
    ];

    // Push each resolved document into the content payload for Gemini
    inlineDocuments.forEach(({ payload }) => {
      geminiContents.push(payload);
    });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const fallbackList = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
    const candidates = Array.from(new Set([preferredModel, ...fallbackList]));
    
    let responseText = null;
    let lastErr = null;

    for (const modelName of candidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(geminiContents);
        responseText = result?.response?.text?.();
        if (responseText) {
          break;
        }
      } catch (err) {
        console.error(`[aiVerifyUser] Model ${modelName} failed:`, err.message || err);
        lastErr = err;
      }
    }

    if (!responseText) {
      return res.status(503).json({
        success: false,
        message: `Failed to analyze documents via AI Generative Services: ${lastErr?.message || 'Unknown Gemini error'}`
      });
    }

    let parsed;
    try {
      const rawText = String(responseText).trim();
      const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidate = fenced ? fenced[1].trim() : rawText;
      parsed = JSON.parse(candidate);
    } catch (err) {
      console.error('[aiVerifyUser] JSON parsing failed for raw Gemini reply:', err, responseText);
      return res.status(500).json({
        success: false,
        message: 'Failed to interpret AI response format. Please try again.',
      });
    }

    return res.json({
      success: true,
      summary: parsed.summary || 'Summary unavailable.',
      decision: String(parsed.decision || 'reject').toLowerCase(),
      reason: parsed.reason || 'Reason description unavailable.',
    });

  } catch (err) {
    console.error('aiVerifyUser error:', err);
    return res.status(500).json({ success: false, message: 'AI verification processing failed.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userId = user._id;
    const role = (user.role || '').toLowerCase();

    const Donation = require('../models/Donation');
    const CustomerOrder = require('../models/CustomerOrder');
    const UserNotification = require('../models/UserNotification');

    const DONOR_ROLES = ['donor', 'restaurant', 'supermarket', 'business', 'individual'];

    // 1. Supplier / Donor cleanups
    if (DONOR_ROLES.includes(role)) {
      await Donation.deleteMany({
        donorId: userId,
        status: { $ne: 'delivered' },
      });
    }
    // 2. NGO Receiver cleanups
    else if (role === 'receiver') {
      await Donation.updateMany(
        {
          receiverId: userId,
          status: { $ne: 'delivered' },
        },
        {
          $set: {
            receiverId: null,
            claimedAt: null,
            status: 'available',
          },
        }
      );
    }
    // 3. Volunteer Driver cleanups
    else if (role === 'driver') {
      await Donation.updateMany(
        {
          driverId: userId,
          status: { $in: ['driver_assigned', 'picked_up', 'in_transit'] },
        },
        {
          $set: {
            driverId: null,
            assignedAt: null,
            pickedUpAt: null,
            status: 'claimed',
          },
        }
      );
      await CustomerOrder.updateMany(
        {
          driverId: userId,
          status: { $in: ['driver_assigned', 'picked_up', 'in_transit'] },
        },
        {
          $set: {
            driverId: null,
            assignedAt: null,
            pickedUpAt: null,
            status: 'finding_driver',
          },
        }
      );
    }

    // 4. Delete user notifications
    await UserNotification.deleteMany({ userId });

    // 5. Log activity (performed by the admin, target is the deleted user)
    const { logActivity } = require('../utils/auditLogger');
    await logActivity(req.user._id, 'USER_DELETED', { deletedUserId: userId, deletedEmail: user.email, deletedRole: user.role }, req);

    // 6. Delete user profile record
    await User.findByIdAndDelete(userId);

    return res.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (err) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

