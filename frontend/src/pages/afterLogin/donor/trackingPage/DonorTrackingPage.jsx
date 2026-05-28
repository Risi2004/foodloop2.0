import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TrackingMap from '../../../../components/afterLogin/donor/trackingPage/trackingMap/TrackingMap';
import TrackingSidebar from '../../../../components/afterLogin/donor/trackingPage/trackingSidebar/TrackingSidebar';
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";
import useLiveTracking from '../../../../hooks/useLiveTracking';
import ChatIconButton from '../../../../components/afterLogin/donationChat/ChatIconButton';
import { getUser } from '../../../../utils/auth';
import { onDeliveryConfirmed } from '../../../../services/socket';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import './DonorTrackingPage.css';

function DonorTrackingPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const rawId = searchParams.get('donationId');
    const donationId = rawId && rawId !== 'undefined' && rawId.trim() !== '' ? rawId.trim() : null;

    // Use live tracking hook (only when we have a valid donationId)
    const { trackingData, driverLocation, loading, error } = useLiveTracking(donationId, {
        interval: 2500,
        enabled: !!donationId
    });

    useEffect(() => {
        if (!donationId) {
            alert('No donation ID provided');
            navigate('/supplier/my-donation');
        }
    }, [donationId, navigate]);

    // When driver confirms delivery, return donor to My Donation page
    useEffect(() => {
        if (!donationId) return;

        const unsubscribe = onDeliveryConfirmed((payload) => {
            if (payload?.donationId === donationId) {
                navigate('/supplier/my-donation');
            }
        });

        return () => {
            unsubscribe();
        };
    }, [donationId, navigate]);

    if (!donationId) {
        return null;
    }

    if (!trackingData && loading) {
        return <PageLoader message="Loading tracking data..." />;
    }

    if (error && !trackingData) {
        return (
            <>
                <DonorNavbar />
                <div className="tracking-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px', padding: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#d32f2f', fontSize: '16px', marginBottom: '16px' }}>⚠️ {error}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#1F4E36',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    const trackingId = trackingData?.donation?.trackingId || 'N/A';

    return (
        <>
        <DonorNavbar />
            <div className="tracking-page">
                <header className="tracking-header">
                    <div className="header-title-row">
                        <div>
                            <h1 className="page-title">Donation Tracking</h1>
                            <p className="tracking-id">Tracking ID: {trackingId}</p>
                        </div>
                    </div>
                </header>

                <main className="tracking-layout">
                    <section className="map-section">
                        <TrackingMap trackingData={trackingData} driverLocation={driverLocation} />
                    </section>
                    <aside className="sidebar-section">
                        <TrackingSidebar trackingData={trackingData} driverLocation={driverLocation} />
                    </aside>
                </main>
            </div>
            <DonorFooter />
            {trackingData?.driver && (
                <ChatIconButton donationId={donationId} currentUser={getUser()} title="Chat about this delivery" />
            )}
        </>
    );
}

export default DonorTrackingPage;
