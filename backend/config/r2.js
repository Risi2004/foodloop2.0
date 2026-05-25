const { S3Client } = require('@aws-sdk/client-s3');

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicBaseUrl };
}

function isR2Configured() {
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicBaseUrl } = getR2Config();
  return !!(accountId && accessKeyId && secretAccessKey && bucketName && publicBaseUrl);
}

function assertR2Configured() {
  if (!isR2Configured()) {
    throw new Error(
      'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_BASE_URL in backend/.env'
    );
  }
}

let client = null;

function getR2Client() {
  assertR2Configured();
  if (client) return client;

  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return client;
}

module.exports = {
  getR2Config,
  isR2Configured,
  assertR2Configured,
  getR2Client,
};
