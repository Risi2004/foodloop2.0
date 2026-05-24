import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DonationForm from '../../../../components/afterLogin/donor/myDonation/donationForm/DonationForm';
import DonorNavbar from '../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar';
import DonorFooter from '../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter';
import { getDonation } from '../../../../services/donationApi';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import './DonorMyDonation.css';

function DonorEditDonation() {
    const { donationId } = useParams();
    const navigate = useNavigate();
    const [donation, setDonation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!donationId) {
            setError('Invalid donation');
            setLoading(false);
            return;
        }
        let cancelled = false;
        const fetchDonation = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await getDonation(donationId);
                if (!cancelled && response?.success && response?.donation) {
                    setDonation(response.donation);
                } else if (!cancelled) {
                    setError(response?.message || 'Donation not found');
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Failed to load donation');
                    setDonation(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchDonation();
        return () => { cancelled = true; };
    }, [donationId]);

    if (loading) {
        return <PageLoader message="Loading donation..." />;
    }

    if (error || !donation) {
        return (
            <>
                <DonorNavbar />
                <div className="new-donation-page">
                    <div className="donation-container">
                        <div className="donation-content" style={{ flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                            <p style={{ color: '#d32f2f', textAlign: 'center' }}>{error || 'Donation not found'}</p>
                            <button
                                type="button"
                                onClick={() => navigate('/donor/my-donation')}
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
                                Back to My Donations
                            </button>
                        </div>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    return (
        <>
            <DonorNavbar />
            <div className="new-donation-page">
                <div className="donation-container">
                    <main className="donation-content">
                        <div className="donation-media-section edit-donation-image-column">
                            <div className="donation-media-wrapper">
                                <p className="upload-hint">Current donation image</p>
                                <div className="edit-donation-image-frame">
                                    <img
                                        src={donation.imageUrl}
                                        alt={donation.itemName || 'Donation'}
                                        className="edit-donation-image"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    <p className="edit-donation-image-fallback hidden">No image</p>
                                </div>
                            </div>
                        </div>
                        <DonationForm
                            editDonationId={donationId}
                            initialData={donation}
                            imageUrl={donation.imageUrl}
                        />
                    </main>
                </div>
            </div>
            <DonorFooter />
        </>
    );
}

export default DonorEditDonation;
