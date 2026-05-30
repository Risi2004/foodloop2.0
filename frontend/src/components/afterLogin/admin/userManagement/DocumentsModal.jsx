import './AdminUserManagement.css';
import {
  getAdminRoleLabel,
  getAdminUserName,
  getAdminUserProfileDetails,
} from '../../../../utils/adminUserDisplay';

const DocumentsModal = ({ user, isOpen, onClose }) => {
  if (!isOpen || !user) return null;

  const isValidUrl = (url) => {
    if (url === null || url === undefined || url === '') return false;

    const urlString = String(url).trim();
    if (
      urlString === '' ||
      urlString === 'null' ||
      urlString === 'undefined' ||
      urlString === 'None' ||
      urlString === 'NaN'
    ) {
      return false;
    }

    if (urlString.startsWith('http://') || urlString.startsWith('https://')) return true;
    if (
      urlString.includes('s3') ||
      urlString.includes('amazonaws.com') ||
      urlString.includes('r2.dev') ||
      urlString.includes('r2.cloudflarestorage.com') ||
      urlString.includes('cloudflare')
    ) {
      return true;
    }

    if (urlString.length > 5 && (urlString.includes('.') || urlString.includes('/'))) {
      return true;
    }

    return false;
  };

  const getFileType = (url) => {
    if (!url) return 'image';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf') || lowerUrl.includes('application/pdf')) return 'pdf';
    return 'image';
  };

  const getDocuments = () => {
    const documents = [];
    const allDocumentFields = [
      { field: 'profileImageUrl', label: 'Profile Image' },
      { field: 'businessRegFileUrl', label: 'Business Registration Document' },
      { field: 'addressProofFileUrl', label: 'Address Proof Document' },
      { field: 'nicFileUrl', label: 'NIC Document' },
      { field: 'licenseFileUrl', label: 'License Document' },
      { field: 'gramaNiladhariLetterUrl', label: 'Grama Niladhari Letter' },
      { field: 'gramaNiladhariLetter', label: 'Grama Niladhari Letter' },
    ];

    allDocumentFields.forEach(({ field, label }) => {
      const fieldValue = user[field];
      if (
        fieldValue !== null &&
        fieldValue !== undefined &&
        fieldValue !== '' &&
        String(fieldValue).trim() !== '' &&
        String(fieldValue).trim() !== 'null' &&
        String(fieldValue).trim() !== 'undefined' &&
        isValidUrl(fieldValue)
      ) {
        const urlString = String(fieldValue).trim();
        documents.push({
          label,
          url: urlString,
          type: getFileType(urlString),
        });
      }
    });

    return documents;
  };

  const profileDetails = getAdminUserProfileDetails(user);
  const documents = getDocuments();
  const userName = getAdminUserName(user);

  return (
    <div className="documents-modal-overlay" onClick={onClose}>
      <div className="documents-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="documents-modal-header">
          <h2>User Details — {userName}</h2>
          <button type="button" className="documents-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="documents-modal-body">
          <section className="user-profile-section">
            <h3 className="user-details-section-title">Profile Information</h3>
            <div className="user-profile-grid">
              {profileDetails.map(({ label, value }) => (
                <div key={label} className="user-profile-field">
                  <span className="user-profile-label">{label}</span>
                  <span className="user-profile-value">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="user-documents-section">
            <h3 className="user-details-section-title">Submitted Documents</h3>
            {documents.length === 0 ? (
              <div className="no-documents">
                <p>No documents submitted</p>
                <p className="no-documents-hint">
                  Expected documents for {getAdminRoleLabel(user.role)} may include profile image, NIC,
                  business registration, or license files depending on account type.
                </p>
              </div>
            ) : (
              <div className="documents-grid">
                {documents.map((doc) => (
                  <div key={`${doc.label}-${doc.url}`} className="document-item">
                    <div className="document-label">{doc.label}</div>
                    {doc.type === 'pdf' ? (
                      <div className="document-pdf-viewer">
                        <iframe src={doc.url} title={doc.label} className="pdf-iframe" />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="document-download-link"
                        >
                          Open in New Tab
                        </a>
                      </div>
                    ) : (
                      <div className="document-image-viewer">
                        <img src={doc.url} alt={doc.label} className="document-image" />
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="document-download-link"
                        >
                          Open in New Tab
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DocumentsModal;
