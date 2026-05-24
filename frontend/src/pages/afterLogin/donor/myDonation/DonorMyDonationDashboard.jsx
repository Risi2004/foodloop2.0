import { useState, useEffect } from 'react';
import "./DonorMyDonationDashboard.css";
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";
import DonationSidebar from "../../../../components/afterLogin/donor/myDonation/DonationSidebar";
import InTransitCard from "../../../../components/afterLogin/donor/myDonation/InTransitCard";
import LookingForReceiverCard from "../../../../components/afterLogin/donor/myDonation/LookingForReceiverCard";
import LookingForDriverCard from "../../../../components/afterLogin/donor/myDonation/LookingForDriverCard";
import CompletedHistoryCard from "../../../../components/afterLogin/donor/myDonation/CompletedHistoryCard";
import { useNavigate } from 'react-router-dom';
import { getMyDonations, deleteDonation } from '../../../../services/donationApi';
import { getSocket, onDonationInTransit, onDeliveryConfirmed } from '../../../../services/socket';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';

const DonorMyDonationDashboard = () => {
    const navigate = useNavigate();
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [impactStats, setImpactStats] = useState({
        mealsShared: 0,
        foodSaved: 0,
        co2Offset: 0
    });

    const fetchDonations = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getMyDonations();
            if (response.success && response.donations) {
                setDonations(response.donations);
                const completedDonations = response.donations.filter(d => d.status === 'delivered');
                const totalMeals = completedDonations.reduce((sum, d) => sum + (d.quantity || 0), 0);
                const totalFoodSaved = totalMeals * 0.6;
                const totalCo2Offset = totalFoodSaved * 2.5;
                setImpactStats({
                    mealsShared: totalMeals,
                    foodSaved: Math.round(totalFoodSaved),
                    co2Offset: Math.round(totalCo2Offset)
                });
            } else {
                setDonations([]);
            }
        } catch (err) {
            console.error('[DonorMyDonationDashboard] Error fetching donations:', err);
            setError(err.message || 'Failed to load your donations');
            setDonations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDonations();
        getSocket();

        const handleInTransit = (payload) => {
            fetchDonations();
            const donationId = payload?.donationId;
            if (donationId) {
                // Driver accepted the order: go to live tracking for this donation
                navigate(`/donor/track-order?donationId=${donationId}`);
            }
        };

        const handleDeliveryConfirmed = () => {
            // Delivery finished: just refresh lists; tracking page will handle redirect back
            fetchDonations();
        };

        const unsubInTransit = onDonationInTransit(handleInTransit);
        const unsubDeliveryConfirmed = onDeliveryConfirmed(handleDeliveryConfirmed);

        return () => {
            unsubInTransit();
            unsubDeliveryConfirmed();
        };
    }, [navigate]);

    // Flow: Looking for Receiver (unclaimed) → Looking for Driver (claimed, no driver) → In Transit → Completed
    const lookingForReceiver = donations.filter(d =>
        (d.status === 'pending' || d.status === 'approved') && !d.assignedReceiverId
    );
    const lookingForDriver = donations.filter(d =>
        d.status === 'assigned' && d.assignedReceiverId && !d.assignedDriverId
    );
    const inTransit = donations.filter(d =>
        (d.status === 'assigned' && d.assignedDriverId) || d.status === 'picked_up'
    );
    const completed = donations.filter(d => d.status === 'delivered');

    const handleEdit = (donation) => {
        navigate(`/donor/edit-donation/${donation.id}`);
    };

    const handleDelete = async (donation) => {
        if (!window.confirm('Are you sure you want to cancel this donation? It will no longer be available for receivers.')) {
            return;
        }
        try {
            await deleteDonation(donation.id);
            await fetchDonations();
        } catch (err) {
            console.error('[DonorMyDonationDashboard] Error deleting donation:', err);
            alert(err.message || 'Failed to cancel donation');
        }
    };

    if (loading) {
        return <PageLoader message="Loading your donations..." />;
    }

    if (error) {
        return (
            <>
                <DonorNavbar />
                <div className="donor-my-donation-container">
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '50vh',
                        flexDirection: 'column',
                        gap: '16px',
                        padding: '20px'
                    }}>
                        <p style={{ color: '#d32f2f', fontSize: '16px', textAlign: 'center' }}>
                            ⚠️ {error}
                        </p>
                        <button 
                            onClick={() => window.location.reload()} 
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
                            Retry
                        </button>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    return (
        <>
            <DonorNavbar />
            <div className="donor-my-donation-container">
                <div className="donor-my-donation-layout">
                    <DonationSidebar impactStats={impactStats} />
                    
                    <main className="donor-my-donation-content">
                        {/* 1. In Transit */}
                        <div className="intransit">
                            <h2 className="active-donations">In Transit Donations</h2>
                            <div className="donation-cards">
                                {inTransit.length > 0 ? (
                                    inTransit.map((donation) => (
                                        <InTransitCard key={donation.id} donation={donation} />
                                    ))
                                ) : (
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
                                        No donations in transit
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 2. Looking for Driver */}
                        <div className="looking">
                            <h2 className="active-donations">Looking for Driver</h2>
                            <div className="donation-cards">
                                {lookingForDriver.length > 0 ? (
                                    lookingForDriver.map((donation) => (
                                        <LookingForDriverCard key={donation.id} donation={donation} />
                                    ))
                                ) : (
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
                                        No donations waiting for driver
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 3. Looking for Receiver */}
                        <div className="lookingForReceiver">
                            <h2 className="active-donations">Looking for Receiver</h2>
                            <div className="donation-cards">
                                {lookingForReceiver.length > 0 ? (
                                    lookingForReceiver.map((donation) => (
                                        <LookingForReceiverCard 
                                            key={donation.id} 
                                            donation={donation}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                ) : (
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
                                        No donations waiting for receiver
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* 4. Completed History */}
                        <div className="complited">
                            <h2 className="active-donations" style={{ color: "darkgreen" }}>Completed History</h2>
                            <div className="donation-cards">
                                {completed.length > 0 ? (
                                    completed.map((donation) => (
                                        <CompletedHistoryCard key={donation.id} donation={donation} />
                                    ))
                                ) : (
                                    <p style={{ color: '#fff', padding: '20px', textAlign: 'center' }}>
                                        No completed donations
                                    </p>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <DonorFooter />
        </>
    );
};

export default DonorMyDonationDashboard;
