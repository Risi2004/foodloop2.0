import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import breakableIcon from "../../../../assets/icons/afterLogin/receiver/Breakable.svg";
import peopleIcon from "../../../../assets/icons/afterLogin/receiver/People.svg";
import swapIcon from "../../../../assets/icons/afterLogin/receiver/Swap.svg";
import gassIcon from "../../../../assets/icons/afterLogin/receiver/Gas Industry.svg";
import foodImage from "../../../../assets/icons/afterLogin/receiver/img.png";
import organicIcon from "../../../../assets/icons/afterLogin/receiver/Organic Food.svg";
import scooterIcon from "../../../../assets/icons/afterLogin/receiver/Delivery Scooter.svg";
import image2 from "../../../../assets/icons/afterLogin/receiver/Image.svg";
import { getDonationReceiptDetails, createImpactReceipt, getReceiptPDF } from '../../../../services/donationApi';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import './ReceiptForm.css';

const ReceiptForm = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const donationId = searchParams.get('donationId');

    // State management
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [donationData, setDonationData] = useState(null);
    const [receiptExists, setReceiptExists] = useState(false);

    // Form state
    const [dropLocation, setDropLocation] = useState('');
    const [peopleFed, setPeopleFed] = useState('');
    const [weightPerServing, setWeightPerServing] = useState('');
    const [formErrors, setFormErrors] = useState({});

    // Calculate methane saved in real-time using useMemo
    // Formula: CH₄ = MSW × 0.05
    // Where MSW = (quantity × weightPerServing) in tons
    // This will update whenever weightPerServing or donationData changes
    // If receipt exists, use the saved methaneSaved value
    const calculatedMethaneSaved = useMemo(() => {
        // If receipt exists, use the saved value (unless it's 0 and we can recalculate from quantity + weightPerServing)
        const savedMethane = donationData?.existingReceipt?.methaneSaved;
        if (receiptExists && savedMethane !== undefined && savedMethane !== null && savedMethane > 0) {
            return savedMethane;
        }
        if (receiptExists && savedMethane === 0 && donationData?.donation?.quantity && weightPerServing) {
            const q = donationData.donation.quantity;
            const w = parseFloat(weightPerServing);
            if (!isNaN(w) && w > 0) {
                const kg = q * w * 0.05;
                return Math.round(kg * 100) / 100;
            }
        }
        if (receiptExists && savedMethane !== undefined && savedMethane !== null) {
            return savedMethane;
        }
        
        if (!donationData?.donation?.quantity) {
            return 0;
        }
        
        const quantity = donationData.donation.quantity;
        
        // Check if weightPerServing has a value
        if (!weightPerServing || weightPerServing.trim() === '') {
            return 0;
        }
        
        const weightPerServingNum = parseFloat(weightPerServing);
        
        // Validate the parsed value
        if (isNaN(weightPerServingNum) || weightPerServingNum <= 0) {
            return 0;
        }
        
        // Calculate methane saved (formula: CH₄ = MSW × 0.05; MSW in tons → result in tons)
        // Display in kg so small donations don't round to 0: methaneSavedKg = totalWeightKg × 0.05
        const totalWeightKg = quantity * weightPerServingNum; // Total weight in kg
        const methaneSavedKg = totalWeightKg * 0.05; // Same factor 0.05, result in kg for display
        
        // Round to 2 decimal places
        const result = Math.round(methaneSavedKg * 100) / 100;
        
        console.log('[ReceiptForm] Methane saved calculated:', {
            quantity,
            weightPerServing: weightPerServingNum,
            totalWeightKg: totalWeightKg.toFixed(2),
            methaneSavedKg: result
        });
        
        return result;
    }, [donationData?.donation?.quantity, weightPerServing, receiptExists, donationData?.existingReceipt?.methaneSaved]);

    // Fetch donation details on component mount
    useEffect(() => {
        const fetchDonationDetails = async () => {
            if (!donationId) {
                setError('Donation ID is required');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const response = await getDonationReceiptDetails(donationId);
                
                if (response.success && response.receiptDetails) {
                    setDonationData(response.receiptDetails);
                    
                    // Check if receipt already exists
                    if (response.receiptDetails.existingReceipt) {
                        setReceiptExists(true);
                        // Populate form with existing receipt data
                        setDropLocation(response.receiptDetails.existingReceipt.dropLocation || '');
                        setPeopleFed(response.receiptDetails.existingReceipt.peopleFed?.toString() || '');
                        setWeightPerServing(response.receiptDetails.existingReceipt.weightPerServing?.toString() || '');
                    } else {
                        setReceiptExists(false);
                        // Form fields remain empty for user input
                    }
                } else {
                    setError('Failed to load donation details');
                }
            } catch (err) {
                console.error('[ReceiptForm] Error fetching donation details:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load donation details');
            } finally {
                setLoading(false);
            }
        };

        fetchDonationDetails();
    }, [donationId]);

    // Validate form
    const validateForm = () => {
        const errors = {};

        if (!dropLocation || dropLocation.trim() === '') {
            errors.dropLocation = 'Drop location is required';
        }

        const peopleFedNum = parseFloat(peopleFed);
        if (!peopleFed || isNaN(peopleFedNum) || peopleFedNum < 1) {
            errors.peopleFed = 'People fed must be a number greater than 0';
        }

        const weightPerServingNum = parseFloat(weightPerServing);
        if (!weightPerServing || isNaN(weightPerServingNum) || weightPerServingNum < 0.001) {
            errors.weightPerServing = 'Weight per serving must be a number greater than or equal to 0.001 kg';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setSuccess(false);

        if (!validateForm()) {
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const receiptData = {
                dropLocation: dropLocation.trim(),
                peopleFed: parseFloat(peopleFed),
                weightPerServing: parseFloat(weightPerServing),
            };

            const response = await createImpactReceipt(donationId, receiptData);

            if (response.success) {
                setSuccess(true);
                
                // Wait a moment for PDF generation, then fetch and open PDF
                setTimeout(async () => {
                    try {
                        console.log('[ReceiptForm] Fetching PDF receipt...');
                        const pdfBlob = await getReceiptPDF(donationId);
                        
                        // Create blob URL and open in new tab
                        const pdfUrl = URL.createObjectURL(pdfBlob);
                        const newWindow = window.open(pdfUrl, '_blank');
                        
                        if (!newWindow) {
                            // If popup blocked, create download link
                            const link = document.createElement('a');
                            link.href = pdfUrl;
                            link.download = `impact-receipt-${donationData?.donation?.trackingId || donationId}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                        
                        // Clean up blob URL after a delay
                        setTimeout(() => {
                            URL.revokeObjectURL(pdfUrl);
                        }, 1000);
                    } catch (pdfError) {
                        console.error('[ReceiptForm] Error fetching PDF:', pdfError);
                        // Don't show error to user, PDF generation might still be in progress
                        // The emails will still be sent
                    }
                }, 1500); // Wait 1.5 seconds for PDF generation
                
                // Redirect to my-claims page after 5 seconds
                setTimeout(() => {
                    navigate('/receiver/my-claims');
                }, 5000);
            } else {
                setError(response.message || 'Failed to create receipt');
            }
        } catch (err) {
            console.error('[ReceiptForm] Error creating receipt:', err);
            
            // Handle validation errors from API
            if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
                const apiErrors = {};
                err.response.data.errors.forEach(error => {
                    if (error.field) {
                        apiErrors[error.field] = error.message;
                    }
                });
                setFormErrors(apiErrors);
            } else {
                setError(err.response?.data?.message || err.message || 'Failed to create receipt');
            }
        } finally {
            setSaving(false);
        }
    };

    // Handle PDF download
    const handleDownloadPDF = async () => {
        if (!donationId) {
            setError('Donation ID is required');
            return;
        }

        try {
            setDownloading(true);
            setError(null);

            const pdfBlob = await getReceiptPDF(donationId);
            
            // Create download link
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `impact-receipt-${donationData?.donation?.trackingId || donationId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up blob URL
            setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
            }, 100);
        } catch (err) {
            console.error('[ReceiptForm] Error downloading PDF:', err);
            setError(err.response?.data?.message || err.message || 'Failed to download PDF');
        } finally {
            setDownloading(false);
        }
    };

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
    };

    // Loading state
    if (loading) {
        return <PageLoader message="Loading donation details..." />;
    }

    // Error state
    if (error && !donationData) {
        return (
            <>
                <ReceiverNavbar />
                <div className="receipt-form" style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '50vh',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '20px'
                }}>
                    <p style={{ color: '#ef4444', fontSize: '16px', textAlign: 'center' }}>{error}</p>
                    <button 
                        onClick={() => navigate('/receiver/my-claims')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#1b4332',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Back to My Claims
                    </button>
                </div>
                <ReceiverFooter />
            </>
        );
    }

    // Success state
    if (success) {
        return (
            <>
                <ReceiverNavbar />
                <div className="receipt-form" style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '50vh',
                    flexDirection: 'column',
                    gap: '16px',
                    padding: '20px'
                }}>
                    <div style={{ color: '#10b981', fontSize: '18px', fontWeight: '600', textAlign: 'center' }}>
                        ✓ Receipt created successfully!
                    </div>
                    <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', maxWidth: '500px' }}>
                        Your impact receipt PDF is being generated and will open in a new tab.<br />
                        Emails with the receipt have been sent to the donor and driver.<br />
                        Redirecting to My Claims...
                    </p>
                </div>
                <ReceiverFooter />
            </>
        );
    }

    // Main form
    return (
        <>
            <ReceiverNavbar />
            <div className="receipt-form">
                <h1>Update the <br />Details</h1>
                <div className="form">
                    <h2>Fill form</h2>
                    <div className="inputs">
                        <div className="current-loc">
                            <div className="point">
                                <div className="frame-23">
                                    <img className="breakable" src={breakableIcon} alt="location" />
                                </div>
                            </div>
                            <div className="div">
                                <div className="current-location">Drop Location</div>
                                <div className="frame-193">
                                    <input
                                        type="text"
                                        className="_0-8-mi-to-recipient"
                                        value={dropLocation}
                                        onChange={(e) => setDropLocation(e.target.value)}
                                        placeholder="Eg:- 0.8 mi to recipient (Central Community Center)"
                                        disabled={saving || receiptExists}
                                        readOnly={receiptExists}
                                        style={receiptExists ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                                    />
                                    {formErrors.dropLocation && (
                                        <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            {formErrors.dropLocation}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="frame-194">
                            <div className="frame-104">
                                <img className="people" src={peopleIcon} alt="people" />
                            </div>
                            <div className="div">
                                <div className="current-location">People Fed</div>
                                <div className="frame-193">
                                    <input
                                        type="number"
                                        className="_0-8-mi-to-recipient"
                                        value={peopleFed}
                                        onChange={(e) => setPeopleFed(e.target.value)}
                                        placeholder="Eg:- 20"
                                        min="1"
                                        disabled={saving || receiptExists}
                                        readOnly={receiptExists}
                                        style={receiptExists ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                                    />
                                    {formErrors.peopleFed && (
                                        <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            {formErrors.peopleFed}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="frame-194">
                            <div className="frame-104">
                                <img className="people" src={gassIcon} alt="weight" style={{ width: '24px', height: '24px' }} />
                            </div>
                            <div className="div">
                                <div className="current-location">Weight per Serving (KG)</div>
                                <div className="frame-193">
                                    <input
                                        type="number"
                                        className="_0-8-mi-to-recipient"
                                        value={weightPerServing}
                                        onChange={(e) => setWeightPerServing(e.target.value)}
                                        placeholder="Eg:- 0.2"
                                        min="0.001"
                                        step="0.001"
                                        disabled={saving || receiptExists}
                                        readOnly={receiptExists}
                                        style={receiptExists ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                                    />
                                    {formErrors.weightPerServing && (
                                        <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            {formErrors.weightPerServing}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {error && (
                <div style={{ 
                    padding: '12px', 
                    margin: '0 20px', 
                    backgroundColor: '#fee2e2', 
                    color: '#dc2626', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}
            <div className="info">
                <div className="infotop">
                    <div className="donor-information">
                        <div className="donor-information2">Donor Information</div>
                        <div className="sarah-jenkins">
                            {donationData?.donor?.name || 'N/A'}
                        </div>
                        <div className="sarah-j-impact-com">
                            {donationData?.donor?.email || 'N/A'}
                        </div>
                    </div>
                    <div className="handling-organizatio">
                        <div className="handling-organizatio2">Handling Organization</div>
                        <div className="community-harvest-ng">
                            {donationData?.receiver?.name || 'N/A'}
                        </div>
                        <div className="delivered-oct-24-2">
                            Delivered: {donationData?.deliveryDate || 'N/A'}
                        </div>
                        <div className="current-loc">
                            <div className="point">
                                <div className="frame-23">
                                    <img className="breakable" src={breakableIcon} alt="location" />
                                </div>
                            </div>
                            <div className="div">
                                <div className="current-location">Drop Location</div>
                                <div className="_0-8-mi-to-recipient">
                                    {dropLocation || 'Enter drop location above'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="cards">
                    <div className="card">
                        <header className="icon-wrapper">
                            <img src={swapIcon} alt="distance" />
                        </header>
                        <div className="cardtxt">
                            <h3>Distance (km)</h3>
                            <p>{donationData?.distanceTraveled?.toFixed(2) || '0'}<span>KM</span></p>
                        </div>
                    </div>
                    <div className="card">
                        <header className="icon-wrapper">
                            <img src={peopleIcon} alt="people" />
                        </header>
                        <div className="cardtxt">
                            <h3>People Fed</h3>
                            <p>{peopleFed || '0'}</p>
                        </div>
                    </div>
                    <div className="card">
                        <header className="icon-wrapper">
                            <img src={gassIcon} alt="methane" />
                        </header>
                        <div className="cardtxt">
                            <h3>Methane Saved</h3>
                            <p>{calculatedMethaneSaved > 0 ? calculatedMethaneSaved.toFixed(2) : '0.00'}<span>KG</span></p>
                        </div>
                    </div>
                </div>
                <section className="delivery-section">
                    <header className="delivery-head">
                        <h2>Food Information</h2>
                        <h2>Driver Information</h2>
                    </header>

                    <section className="delivery-body">
                        <article className="food-card" aria-label="Food details">
                            <img 
                                src={donationData?.donation?.imageUrl || foodImage} 
                                alt={donationData?.donation?.itemName || 'Food item'}
                                onError={(e) => {
                                    e.target.src = foodImage;
                                }}
                            />

                            <section>
                                <header>
                                    <h3>
                                        {donationData?.donation?.itemName || 'Food Item'} 
                                        ({formatQuantity(donationData?.donation?.quantity)})
                                    </h3>
                                    <p>
                                        {donationData?.driver 
                                            ? `Delivered by ${donationData.driver.name}`
                                            : 'Driver information not available'}
                                    </p>
                                </header>

                                <footer className="food-meta">
                                    <img src={organicIcon} alt="organic" />
                                    <p>
                                        <strong>{donationData?.donation?.quantity || 0}</strong> 
                                        <span>Available</span>
                                    </p>
                                </footer>
                            </section>
                        </article>

                        <article className="driver-card" aria-label="Driver details">
                            {donationData?.driver ? (
                                <>
                                    <section className="driver-row" aria-label="Current location and driver">
                                        <div className="driver-left">
                                            <span className="driver-badge" aria-hidden="true">
                                                <span className="driver-badge__inner">
                                                    <img src={scooterIcon} alt="scooter" />
                                                </span>
                                            </span>

                                            <dl>
                                                <dt>Current Location</dt>
                                                <dd>{dropLocation || 'Enter drop location'}</dd>
                                            </dl>
                                        </div>

                                        <div className="driver-right" aria-label="Driver identity">
                                            <img src={image2} alt="Driver avatar" />
                                            <p>{donationData.driver.name}</p>
                                        </div>
                                    </section>

                                    <section className="driver-row" aria-label="Vehicle details">
                                        <div className="driver-left">
                                            <img className="driver-vehicle-icon" src={scooterIcon} alt="" aria-hidden="true" />
                                            <dl>
                                                <dt>Vehicle Type</dt>
                                                <dd>{donationData.driver.vehicleType || 'N/A'}</dd>
                                            </dl>
                                        </div>

                                        <dl className="driver-right driver-right--stack">
                                            <dt>Vehicle Number</dt>
                                            <dd>{donationData.driver.vehicleNumber || 'N/A'}</dd>
                                        </dl>
                                    </section>
                                </>
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                    Driver information not available
                                </div>
                            )}
                        </article>
                    </section>
                </section>

                <footer className="info-actions">
                    {receiptExists ? (
                        <button 
                            type="button" 
                            className="save-btn"
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            style={{
                                opacity: downloading ? 0.6 : 1,
                                cursor: downloading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {downloading ? 'Downloading...' : 'Download PDF'}
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            className="save-btn"
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                opacity: saving ? 0.6 : 1,
                                cursor: saving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                </footer>
            </div>
            <ReceiverFooter />
        </>
    );
};

export default ReceiptForm;
