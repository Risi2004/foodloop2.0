import { useState, useRef } from 'react';
import { uploadAndAnalyzeImage } from '../../../../../services/donationApi';
import fileUploadIcon from '../../../../../assets/icons/afterLogin/donor/my-donations/File-upload.svg';
import cameraIcon from '../../../../../assets/icons/afterLogin/donor/my-donations/Camera.svg';
import './DonationMedia.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function DonationMedia({ onImageUploaded, onAnalysisComplete, onError }) {
    const [, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [, setImageUrl] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const validateFile = (file) => {
        if (!file) return { valid: false, message: 'Please select a file.' };
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return { valid: false, message: 'Upload only JPEG, JPG or PNG (under 10 MB).' };
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return { valid: false, message: 'File must be under 10 MB. Upload only JPEG, JPG or PNG.' };
        }
        return { valid: true };
    };

    // Handle file selection from gallery
    const handleGalleryClick = () => {
        fileInputRef.current?.click();
    };

    // Handle camera capture
    const handleCameraClick = () => {
        cameraInputRef.current?.click();
    };

    // Handle file selection (both gallery and camera)
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const { valid, message } = validateFile(file);
            if (!valid) {
                setUploadError(message);
                return;
            }
            setUploadError(null);
            if (onError) onError(null);

            setSelectedImage(file);
            
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);

            // Upload and analyze image
            await uploadAndAnalyzeImageFile(file);
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // Upload and analyze image
    const uploadAndAnalyzeImageFile = async (file) => {
        try {
            setUploading(true);
            setAnalyzing(true);
            console.log('[DonationMedia] Starting upload and analysis for file:', file.name);

            // Upload and analyze
            const result = await uploadAndAnalyzeImage(file);
            console.log('[DonationMedia] Upload and analysis complete:', {
                imageUrl: result.imageUrl,
                hasPredictions: !!result.predictions,
                predictions: result.predictions
            });
            
            setImageUrl(result.imageUrl);
            setUploading(false);
            setUploadError(null);

            // Notify parent components
            if (onImageUploaded) {
                onImageUploaded(result.imageUrl);
            }

            // Always pass predictions if they exist, even if incomplete
            // If predictions are null but imageUrl exists, AI was unavailable but image uploaded successfully
            if (onAnalysisComplete) {
                if (result.predictions) {
                    console.log('[DonationMedia] Passing predictions to form:', result.predictions);
                    onAnalysisComplete(result.predictions);
                } else if (result.imageUrl) {
                    console.warn('[DonationMedia] No predictions in result, but image uploaded successfully');
                    // Image uploaded but AI unavailable - user can fill form manually
                    onAnalysisComplete(null);
                } else {
                    console.warn('[DonationMedia] No predictions and no image URL');
                    onAnalysisComplete(null);
                }
            }

            setAnalyzing(false);
        } catch (error) {
            // Only log errors in development, not show to users
            if (import.meta.env.DEV) {
                console.error('[DonationMedia] Error uploading/analyzing image:', error);
            }
            
            setUploading(false);
            setAnalyzing(false);
            
            // Extract error message
            let errorMessage = 'Failed to upload or analyze image';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
                // Use the first error message from the errors array
                errorMessage = error.response.data.errors[0].message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Check if it's an AI-generated image error
            const isAiGeneratedError = errorMessage.includes('AI-generated') || 
                                      errorMessage.includes('ai-generated') ||
                                      errorMessage.includes('synthetic') ||
                                      errorMessage.includes('fake') ||
                                      errorMessage.includes('computer-generated') ||
                                      errorMessage.includes('real photo');
            
            // Check if it's a validation error (non-food items)
            const isValidationError = errorMessage.includes('not related to food') || 
                                     errorMessage.includes('does not contain food') || 
                                     errorMessage.includes('Non-food items') || 
                                     errorMessage.includes('No food items') ||
                                     errorMessage.includes('must contain food') ||
                                     errorMessage.includes('non-food');
            
            // Check if it's a temporary AI service error (allow user to proceed)
            const isTemporaryError = errorMessage.includes('temporarily unavailable') ||
                                    errorMessage.includes('AI service') ||
                                    errorMessage.includes('timeout') ||
                                    errorMessage.includes('not available') ||
                                    errorMessage.includes('rate limit') ||
                                    errorMessage.includes('quota');
            
            // If it's a temporary error and we have an image URL, allow user to proceed
            // Check if the response actually succeeded but just has no predictions
            if (error.response?.data?.success && error.response?.data?.imageUrl) {
                console.log('[DonationMedia] AI unavailable but image uploaded, allowing user to proceed');
                setImageUrl(error.response.data.imageUrl);
                if (onImageUploaded) {
                    onImageUploaded(error.response.data.imageUrl);
                }
                if (onAnalysisComplete) {
                    onAnalysisComplete(null); // No AI predictions, but image is uploaded
                }
                // Show info message instead of error
                if (onError) {
                    onError('ℹ️ Image uploaded successfully. AI analysis is temporarily unavailable. Please fill the form manually.');
                }
                setUploading(false);
                setAnalyzing(false);
                return; // Exit early, don't show error
            }
            
            // Show user-friendly error message for actual errors
            if (onError) {
                if (isAiGeneratedError) {
                    // Simple, clear message for AI-generated images
                    onError('⚠️ AI-generated images are not allowed. Please upload a real photo of food.');
                } else if (isValidationError) {
                    // Simple, clear message for non-food items
                    onError('⚠️ This image is not related to food items. Please upload an image of food only.');
                } else if (isTemporaryError) {
                    // Inform user but allow them to proceed if image was uploaded
                    onError('ℹ️ AI analysis is temporarily unavailable. You can still fill the form manually.');
                } else {
                    onError(errorMessage);
                }
            } else {
                if (isAiGeneratedError) {
                    alert('⚠️ AI-generated images are not allowed. Please upload a real photo of food.');
                } else if (isValidationError) {
                    alert('⚠️ This image is not related to food items. Please upload an image of food only.');
                } else if (isTemporaryError) {
                    alert('ℹ️ AI analysis is temporarily unavailable. You can still fill the form manually.');
                } else {
                    alert(`Error: ${errorMessage}. You can still fill the form manually.`);
                }
            }
        }
    };

    // Handle drag and drop
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (file) {
            const { valid, message } = validateFile(file);
            if (!valid) {
                setUploadError(message);
                return;
            }
            setUploadError(null);
            if (onError) onError(null);

            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            uploadAndAnalyzeImageFile(file);
        } else {
            setUploadError('Upload only JPEG, JPG or PNG (under 10 MB).');
        }
    };

    // Remove selected image
    const handleRemoveImage = (e) => {
        e.stopPropagation();
        setSelectedImage(null);
        setImagePreview(null);
        setImageUrl(null);
        setUploadError(null);
        setUploading(false);
        setAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (onImageUploaded) onImageUploaded(null);
        if (onAnalysisComplete) onAnalysisComplete(null);
    };

    return (
        <div className="donation-media-section">
            <div className="donation-media-wrapper">
            <div className="mobile-frame">
                <div className="mobile-screen">
                    <div className="mobile-screen-content">
                        <div 
                            className="camera-view"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            style={{
                                backgroundImage: imagePreview 
                                    ? `url(${imagePreview})` 
                                    : `url('https://images.unsplash.com/photo-1595855709940-fae372671549?q=80&w=2670&auto=format&fit=crop')`
                            }}
                        >
                            {!imagePreview && (
                                <div className="upload-zone" onClick={handleGalleryClick}>
                                    <span className="upload-icon">📷</span>
                                    <p>Drag and Drop</p>
                                </div>
                            )}
                            {imagePreview && (
                                <div className="image-preview-overlay">
                                    {(uploading || analyzing) && (
                                        <div className="ai-loading-overlay">
                                            <div className="loading-content">
                                                <div className="loading-spinner">
                                                    <div className="spinner-ring"></div>
                                                    <div className="spinner-ring"></div>
                                                    <div className="spinner-ring"></div>
                                                </div>
                                                <div className="loading-text">
                                                    {uploading && (
                                                        <>
                                                            <h3>Uploading Image...</h3>
                                                            <p>Please wait while we upload your image</p>
                                                        </>
                                                    )}
                                                    {analyzing && !uploading && (
                                                        <>
                                                            <h3>AI Analyzing Food</h3>
                                                            <p>Detecting food items and assessing quality...</p>
                                                            <div className="loading-dots">
                                                                <span></span>
                                                                <span></span>
                                                                <span></span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <button 
                                        className="remove-image-btn" 
                                        onClick={handleRemoveImage}
                                        title="Remove image"
                                        disabled={uploading || analyzing}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="upload-hint-screen">
                        {!imagePreview && !uploadError && (
                            <p className="upload-hint">Upload only JPEG, JPG or PNG (under 10 MB)</p>
                        )}
                        {uploadError && (
                            <p className="upload-error">{uploadError}</p>
                        )}
                    </div>
                </div>

                <div className="mobile-controls">
                    <button 
                        className="media-btn gallery-btn" 
                        onClick={handleGalleryClick}
                        title="Upload from gallery"
                    >
                        <img src={fileUploadIcon} alt="Upload from gallery" className="media-btn-icon" />
                    </button>
                    <button 
                        className="media-btn camera-btn" 
                        onClick={handleCameraClick}
                        title="Take photo"
                    >
                        <img src={cameraIcon} alt="Take photo" className="media-btn-icon" />
                    </button>
                </div>
            </div>
            </div>

            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    );
}

export default DonationMedia;
