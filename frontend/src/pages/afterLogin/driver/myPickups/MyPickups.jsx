import { useState, useEffect } from 'react';
import DriverNavbar from '../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar';
import DriverFooter from '../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter';
import truckIcon from "../../../../assets/icons/afterLogin/driver/Truck.svg";
import trendIcon from "../../../../assets/icons/afterLogin/driver/Trend-Up.svg";
import swapIcon from "../../../../assets/icons/afterLogin/driver/Swap.svg";
import trophyIcon from "../../../../assets/icons/afterLogin/driver/Trophy.svg";
import starIcon from "../../../../assets/icons/afterLogin/driver/Mandriva.svg";
import './MyPickups.css';
import InTransitDeliveryCard from '../../../../components/afterLogin/driver/InTransitDeliveryCard/InTransitDeliveryCard';
import DeliveredCard from "../../../../components/afterLogin/driver/profile/DeliveredCard";
import { getDriverStatistics, getDriverCompletedDeliveries, getActiveDeliveries } from '../../../../services/donationApi';
import PageLoader from '../../../../components/common/PageLoader/PageLoader';

function MyPickups() {
    const [statistics, setStatistics] = useState(null);
    const [inTransitDeliveries, setInTransitDeliveries] = useState([]);
    const [completedDeliveries, setCompletedDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all data in parallel
            const [statsResponse, activeResponse, completedResponse] = await Promise.all([
                getDriverStatistics(),
                getActiveDeliveries(),
                getDriverCompletedDeliveries()
            ]);

            if (statsResponse.success) {
                setStatistics(statsResponse.statistics);
            }

            if (activeResponse.success && activeResponse.deliveries) {
                setInTransitDeliveries(activeResponse.deliveries);
            }

            if (completedResponse.success && completedResponse.deliveries) {
                // Show only the most recent 10 completed deliveries
                setCompletedDeliveries(completedResponse.deliveries.slice(0, 10));
            }
        } catch (err) {
            console.error('[MyPickups] Error fetching data:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount and when user returns to this page (e.g. after confirming a pickup)
    useEffect(() => {
        fetchData();
    }, []);

    // Refetch In Transit when tab/window gains focus (e.g. after confirming pickup on Delivery/Pickup page)
    useEffect(() => {
        const handleFocus = async () => {
            if (document.hidden) return;
            try {
                const activeResponse = await getActiveDeliveries();
                if (activeResponse?.success && activeResponse.deliveries) {
                    setInTransitDeliveries(activeResponse.deliveries);
                }
            } catch (err) {
                console.warn('[MyPickups] Focus refetch failed:', err);
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    // Format trend display
    const formatTrend = (trend) => {
        if (!trend && trend !== 0) return '+0%';
        const sign = trend >= 0 ? '+' : '';
        return `${sign}${trend}%`;
    };

    // Get badge name based on level
    const getBadgeName = (level) => {
        const badges = {
            'Beginner': 'Getting Started',
            'Helper': 'Community Helper',
            'Hero': 'Community Hero',
            'Champion': 'Community Champion'
        };
        return badges[level] || 'Getting Started';
    };

    if (loading) {
        return <PageLoader message="Loading your pickups..." />;
    }

    if (error) {
        return (
            <>
                <DriverNavbar />
                <div className='my__pickups' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '600px', padding: '20px' }}>
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
                <DriverFooter />
            </>
        );
    }
    return (
        <>
            <DriverNavbar />
            <div className='my__pickups'>
                <div className='my__pickups__s1'>
                    <h1>My Pickups</h1>
                    <div className='my__pickups__s1__sub'>
                        <div className='my__pickups__s1__sub1'>
                            <h5>Deliveries Completed</h5>
                            <img src={truckIcon} alt="truck" />
                        </div>
                        <h1>{statistics?.totalDeliveriesCompleted || 0}</h1>
                        <div className='my__pickups__s1__sub2'>
                            <img src={trendIcon} alt="trend" />
                            <p>{formatTrend(statistics?.deliveriesTrend || 0)} this month</p>
                        </div>
                    </div>
                    <div className='my__pickups__s1__sub'>
                        <div className='my__pickups__s1__sub1'>
                            <h5>Distance (km)</h5>
                            <img src={swapIcon} alt="truck" />
                        </div>
                        <h1>{statistics?.totalDistanceTravelledFormatted || '0 Km'}</h1>
                        <div className='my__pickups__s1__sub2'>
                            <img src={trendIcon} alt="trend" />
                            <p>{formatTrend(statistics?.distanceTrend || 0)} this month</p>
                        </div>
                    </div>
                    <div className='my__pickups__s1__sub earnings-stat'>
                        <div className='my__pickups__s1__sub1'>
                            <h5>Total Earnings</h5>
                            <img src={trophyIcon} alt="earnings" style={{ filter: 'hue-rotate(140deg)' }} />
                        </div>
                        <h1>LKR {statistics?.totalEarnings?.toLocaleString() || '0'}</h1>
                        <div className='my__pickups__s1__sub2'>
                            <img src={trendIcon} alt="trend" />
                            <p>{formatTrend(statistics?.earningsTrend || 0)} this month</p>
                        </div>
                    </div>
                    <div className='driver__profile__s2__sub1__sub3'>
                        <div className='driver__profile__s2__sub1__sub3__sub1'>
                            <h3>Your Impact Progress</h3>
                            <div className='driver__profile__s2__sub1__sub3__sub1__badge'>
                                <img src={trophyIcon} alt="trophy" />
                                <p>{getBadgeName(statistics?.impactProgress?.badgeLevel || 'Beginner')}</p>
                            </div>
                        </div>
                        <div className='driver__profile__s2__sub1__sub3__sub2'>
                            <img src={starIcon} alt="star" />
                            <div className='driver__profile__s2__sub1__sub3__sub2__sub'>
                                <div className='driver__profile__s2__sub1__sub3__sub2__sub__text'>
                                    <p>{statistics?.impactProgress?.currentCount || 0}/{statistics?.impactProgress?.nextBadgeTarget || 10} Pickups Completed</p>
                                    <p>{statistics?.impactProgress?.progressPercentage || 0}%</p>
                                </div>
                                <div className='driver__profile__s2__sub1__sub3__sub2__sub__bar'>
                                    <div 
                                        className='driver__profile__s2__sub1__sub3__sub2__sub__bar__fill'
                                        style={{ width: `${Math.min(statistics?.impactProgress?.progressPercentage || 0, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <p className="driver__profile__s2__sub1__sub3__p">
                            {statistics?.impactProgress?.remainingForNextBadge > 0
                                ? `"Just ${statistics.impactProgress.remainingForNextBadge} more ${statistics.impactProgress.remainingForNextBadge === 1 ? 'pickup' : 'pickups'} to earn your next badge!"`
                                : '"Congratulations! You\'ve reached the maximum badge level!"'}
                        </p>
                    </div>
                </div>

                <div className='my__pickups__s2'>

                    <div className='my__pickups__s2__sub1'>
                        <h1>In Transit Pickups</h1>
                        <div className="my__pickups__s2__sub1__cards">
                            {inTransitDeliveries.length > 0 ? (
                                inTransitDeliveries.map((delivery) => (
                                    <InTransitDeliveryCard key={delivery.id} donation={delivery} />
                                ))
                            ) : (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
                                    <p style={{ fontSize: '16px' }}>No pickups in transit</p>
                                    <p style={{ fontSize: '12px' }}>Confirm a pickup from Available Pickups (Delivery page) to see your orders here</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className='my__pickups__s2__sub2'>
                        <h1>Completed History</h1>
                        <div className='my__pickups__s2__sub2__sub'>
                            {completedDeliveries.length > 0 ? (
                                completedDeliveries.map((delivery) => (
                                    <DeliveredCard key={delivery.id} donation={delivery} />
                                ))
                            ) : (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
                                    <p style={{ fontSize: '16px' }}>No completed deliveries yet</p>
                                    <p style={{ fontSize: '12px' }}>Your completed deliveries will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <DriverFooter />
        </>
    )
}

export default MyPickups;