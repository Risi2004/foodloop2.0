const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getR2Client, getR2Config, assertR2Configured } = require('../config/r2');

const SIGNUP_FILE_FIELDS = [
  'profileImage',
  'businessRegFile',
  'addressProofFile',
  'nicFile',
  'licenseFile',
  'gramaNiladhariLetter',
];

function extensionFromFile(file) {
  const fromName = path.extname(file.originalname || '');
  if (fromName) return fromName.toLowerCase();

  const mime = file.mimetype || '';
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/png') return '.png';
  return '';
}

function buildObjectKey(userId, fieldname, file) {
  const ext = extensionFromFile(file);
  return `users/${userId}/${fieldname}-${Date.now()}${ext}`;
}

function buildPublicUrl(key) {
  const { publicBaseUrl } = getR2Config();
  const base = publicBaseUrl.replace(/\/$/, '');
  return `${base}/${key}`;
}

async function uploadSignupFile({ userId, fieldname, file }) {
  assertR2Configured();

  if (!file?.buffer) {
    throw new Error(`Missing file buffer for ${fieldname}`);
  }

  const { bucketName } = getR2Config();
  const key = buildObjectKey(userId, fieldname, file);
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return buildPublicUrl(key);
}

async function uploadSignupFilesToR2(userId, files) {
  if (!files || Object.keys(files).length === 0) return {};

  const hasAnyFile = SIGNUP_FILE_FIELDS.some((field) => files[field]?.[0]);
  if (hasAnyFile) assertR2Configured();

  const out = {};
  for (const field of SIGNUP_FILE_FIELDS) {
    const arr = files[field];
    if (arr?.[0]) {
      out[field] = await uploadSignupFile({
        userId,
        fieldname: field,
        file: arr[0],
      });
    }
  }
  return out;
}

module.exports = {
  SIGNUP_FILE_FIELDS,
  uploadSignupFile,
  uploadSignupFilesToR2,
  buildPublicUrl,
};
