import { useState, useEffect } from 'react';
import './AdminUserManagement.css';
import {
  getAdminRoleLabel,
  getAdminUserName,
  getAdminUserProfileDetails,
} from '../../../../utils/adminUserDisplay';
import { aiVerifyUser } from '../../../../services/api';

const DocumentsModal = ({ user, isOpen, onClose }) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [loadingPhase, setLoadingPhase] = useState('');

  const PHASES = [
    'Initializing AI Document Scan...',
    'Reading national identity cards & business registers...',
    'Cross-referencing address proofs & GN letters...',
    'Validating authenticity & verifying registration stamps...',
    'Finalizing evaluation and preparing recommendation...'
  ];

  // Reset AI states when a different user is viewed
  useEffect(() => {
    setAiResult(null);
    setAiLoading(false);
    setAiError('');
  }, [user?._id, user?.id]);

  const handleAiVerify = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    
    let phaseIndex = 0;
    setLoadingPhase(PHASES[0]);
    const interval = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      setLoadingPhase(PHASES[phaseIndex]);
    }, 3000);
    
    try {
      const res = await aiVerifyUser(user._id || user.id);
      if (res.success) {
        setAiResult({
          summary: res.summary,
          decision: res.decision,
          reason: res.reason
        });
      } else {
        setAiError(res.message || 'Failed to complete AI verification audit.');
      }
    } catch (err) {
      setAiError(err.message || 'An error occurred during AI analysis.');
    } finally {
      clearInterval(interval);
      setAiLoading(false);
    }
  };

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

          {/* AI Verification Co-Pilot Section */}
          <section className="user-ai-analysis-section">
            <h3 className="user-details-section-title">AI Verification Co-Pilot</h3>
            
            {!aiResult && !aiLoading && (
              <div className="ai-pilot-intro-card">
                <div className="ai-pilot-icon">🤖</div>
                <div className="ai-pilot-text">
                  <h4>Let AI Audit the Documents</h4>
                  <p>Our multimodal AI Co-Pilot will scan all submitted PDF/image files and verify them against the user profile information.</p>
                </div>
                <button 
                  type="button" 
                  className="admin-btn"
                  onClick={handleAiVerify}
                  style={{ marginLeft: 'auto' }}
                >
                  Run AI Audit
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="ai-pilot-loading-card">
                <div className="ai-spinner"></div>
                <div className="ai-loading-details">
                  <h4>Analyzing Files...</h4>
                  <p className="ai-phase-text">{loadingPhase}</p>
                </div>
              </div>
            )}

            {aiError && (
              <div className="ai-pilot-error-card">
                <span className="error-icon">⚠️</span>
                <p>{aiError}</p>
                <button 
                  type="button" 
                  className="admin-btn admin-btn--secondary"
                  onClick={handleAiVerify}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  Retry
                </button>
              </div>
            )}

            {aiResult && (
              <div className={`ai-pilot-result-card ${aiResult.decision}`}>
                <div className="ai-result-header">
                  <span className="ai-pilot-badge-icon">🤖</span>
                  <div className="ai-result-title">
                    <h4>AI Evaluation Summary</h4>
                    <p>Scanned via Google Gemini Multimodal Engine</p>
                  </div>
                  <span className={`ai-recommendation-badge ${aiResult.decision}`}>
                    {aiResult.decision === 'approve' ? 'Approve Recommended' : 'Reject Recommended'}
                  </span>
                </div>
                
                <div className="ai-result-body">
                  <div className="ai-summary-block">
                    <h5>Document Scan Findings</h5>
                    <p>{aiResult.summary}</p>
                  </div>
                  
                  <div className="ai-decision-reasons">
                    <h5>{aiResult.decision === 'approve' ? 'Verification Success' : 'Mismatch / Verification Flags'}</h5>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{aiResult.reason}</p>
                  </div>
                </div>
                
                <div className="ai-result-footer">
                  <button 
                    type="button" 
                    className="admin-btn admin-btn--secondary" 
                    onClick={handleAiVerify}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                  >
                    Re-Analyze Documents
                  </button>
                </div>
              </div>
            )}
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
                {documents.map((doc, index) => (
                  <div key={`${doc.label}-${doc.url}-${index}`} className="document-item">
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
