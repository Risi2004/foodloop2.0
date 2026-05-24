import './AdminUserManagement.css';

const DocumentsModal = ({ user, isOpen, onClose }) => {
    if (!isOpen || !user) return null;

    // Helper function to check if URL is valid
    const isValidUrl = (url) => {
        // Handle null, undefined, empty string
        if (url === null || url === undefined || url === '') {
            return false;
        }
        
        // Convert to string and trim
        const urlString = String(url).trim();
        
        // Check for invalid string representations
        if (urlString === '' || 
            urlString === 'null' || 
            urlString === 'undefined' || 
            urlString === 'None' ||
            urlString === 'NaN') {
            return false;
        }
        
        // Check if it looks like a valid URL or file path
        // Accept URLs starting with http:// or https://
        if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
            return true;
        }
        
        // Accept S3 URLs (s3:// or s3.amazonaws.com)
        if (urlString.includes('s3') || urlString.includes('amazonaws.com')) {
            return true;
        }
        
        // Accept any string that looks like a file path (has extension or is reasonably long)
        if (urlString.length > 5 && (urlString.includes('.') || urlString.includes('/'))) {
            return true;
        }
        
        return false;
    };

    // Helper function to determine file type
    const getFileType = (url) => {
        if (!url) return 'image';
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('.pdf') || lowerUrl.includes('application/pdf')) {
            return 'pdf';
        }
        return 'image';
    };

    // Get documents - check ALL possible document fields regardless of role
    // This ensures we show all documents that were uploaded during signup
    const getDocuments = () => {
        const documents = [];
        
        // Define all possible document fields with their labels
        const allDocumentFields = [
            { field: 'profileImageUrl', label: 'Profile Image' },
            { field: 'businessRegFileUrl', label: 'Business Registration Document' },
            { field: 'addressProofFileUrl', label: 'Address Proof Document' },
            { field: 'nicFileUrl', label: 'NIC Document' },
            { field: 'licenseFileUrl', label: 'License Document' }
        ];

        // Check ALL document fields and add any that exist
        allDocumentFields.forEach(({ field, label }) => {
            const fieldValue = user[field];
            console.log(`Checking ${field}:`, fieldValue, 'Type:', typeof fieldValue, 'IsValid:', isValidUrl(fieldValue));
            
            // More lenient check - if field exists and is not explicitly null/undefined/empty, include it
            if (fieldValue !== null && 
                fieldValue !== undefined && 
                fieldValue !== '' && 
                String(fieldValue).trim() !== '' &&
                String(fieldValue).trim() !== 'null' &&
                String(fieldValue).trim() !== 'undefined') {
                
                const urlString = String(fieldValue).trim();
                console.log(`✓ Document found: ${label} - ${urlString}`);
                documents.push({
                    label: label,
                    url: urlString,
                    type: getFileType(urlString)
                });
            } else {
                console.log(`✗ Missing or invalid: ${field} =`, fieldValue);
            }
        });

        return documents;
    };

    const documents = getDocuments();
    
    // Debug: Log user data to console to help identify missing documents
    console.log('=== Documents Modal Debug ===');
    console.log('User role:', user.role);
    console.log('User donorType:', user.donorType);
    console.log('All user fields:', Object.keys(user));
    console.log('Document URLs in user object:');
    console.log('  - profileImageUrl:', user.profileImageUrl);
    console.log('  - businessRegFileUrl:', user.businessRegFileUrl);
    console.log('  - addressProofFileUrl:', user.addressProofFileUrl);
    console.log('  - nicFileUrl:', user.nicFileUrl);
    console.log('  - licenseFileUrl:', user.licenseFileUrl);
    console.log('Documents found:', documents);
    console.log('===========================');
    
    const userName = user.role === 'Donor' 
        ? (user.donorType === 'Business' ? user.businessName : user.username) || user.email
        : user.role === 'Receiver' 
        ? user.receiverName || user.email
        : user.role === 'Driver'
        ? user.driverName || user.email
        : user.email;

    return (
        <div className="documents-modal-overlay" onClick={onClose}>
            <div className="documents-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="documents-modal-header">
                    <h2>Documents - {userName}</h2>
                    <button className="documents-modal-close" onClick={onClose}>×</button>
                </div>
                <div className="documents-modal-body">
                    {documents.length === 0 ? (
                        <div className="no-documents">
                            <p>No documents submitted</p>
                            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '15px', textAlign: 'left', maxWidth: '500px', margin: '15px auto 0' }}>
                                <p style={{ marginBottom: '10px' }}>
                                    <strong>Expected documents for {user.role}:</strong>
                                </p>
                                {user.role === 'Donor' && user.donorType === 'Business' && (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        <li>• Profile Image</li>
                                        <li>• Business Registration Document</li>
                                        <li>• Address Proof Document</li>
                                    </ul>
                                )}
                                {user.role === 'Donor' && user.donorType === 'Individual' && (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        <li>• Profile Image (optional)</li>
                                    </ul>
                                )}
                                {user.role === 'Receiver' && (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        <li>• Profile Image (optional)</li>
                                    </ul>
                                )}
                                {user.role === 'Driver' && (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        <li>• Profile Image</li>
                                        <li>• NIC Document</li>
                                        <li>• License Document</li>
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="documents-grid">
                            {documents.map((doc, index) => (
                                <div key={index} className="document-item">
                                    <div className="document-label">{doc.label}</div>
                                    {doc.type === 'pdf' ? (
                                        <div className="document-pdf-viewer">
                                            <iframe 
                                                src={doc.url} 
                                                title={doc.label}
                                                className="pdf-iframe"
                                            />
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
                                            <img 
                                                src={doc.url} 
                                                alt={doc.label}
                                                className="document-image"
                                            />
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
                </div>
            </div>
        </div>
    );
};

export default DocumentsModal;
