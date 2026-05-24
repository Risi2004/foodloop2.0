import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TrackingMap from '../../../../components/afterLogin/donor/trackingPage/trackingMap/TrackingMap';
import TrackingSidebar from '../../../../components/afterLogin/donor/trackingPage/trackingSidebar/TrackingSidebar';
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import useLiveTracking from '../../../../hooks/useLiveTracking';
import ChatIconButton from '../../../../components/afterLogin/donationChat/ChatIconButton';
import { getUser } from '../../../../utils/auth';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';
import { onDeliveryConfirmed } from '../../../../services/socket';
import './ReceiverTrackingPage.css';

function ReceiverTrackingPage() {
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
            navigate('/receiver/my-claims');
        }
    }, [donationId, navigate]);

    // When driver confirms delivery, return receiver to My Claims page
    useEffect(() => {
        if (!donationId) return;

        const unsubscribe = onDeliveryConfirmed((payload) => {
            if (payload?.donationId === donationId) {
                navigate('/receiver/my-claims');
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
                <ReceiverNavbar />
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
                                fontSize: '14px',
                                marginRight: '10px'
                            }}
                        >
                            Retry
                        </button>
                        <button 
                            onClick={() => navigate('/receiver/my-claims')} 
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#6b7280',
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
                </div>
                <ReceiverFooter />
            </>
        );
    }

    const trackingId = trackingData?.donation?.trackingId || 'N/A';

    return (
        <>
        <ReceiverNavbar />
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
            <ReceiverFooter />
            {trackingData?.driver && (
                <ChatIconButton donationId={donationId} currentUser={getUser()} title="Chat about this delivery" />
            )}
        </>
    );
}

export default ReceiverTrackingPage;
