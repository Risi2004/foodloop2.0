const multer = require('multer');

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const pdfType = 'application/pdf';

  if (file.fieldname === 'profileImage') {
    if (imageTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Profile image must be JPEG or PNG'));
  }

  if (pdfType === file.mimetype) return cb(null, true);
  return cb(new Error('Only PDF files are allowed for documents'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const signupFields = [
  { name: 'profileImage', maxCount: 1 },
  { name: 'businessRegFile', maxCount: 1 },
  { name: 'addressProofFile', maxCount: 1 },
  { name: 'nicFile', maxCount: 1 },
  { name: 'licenseFile', maxCount: 1 },
  { name: 'gramaNiladhariLetter', maxCount: 1 },
];

const signupUpload = upload.fields(signupFields);

module.exports = { signupUpload };
