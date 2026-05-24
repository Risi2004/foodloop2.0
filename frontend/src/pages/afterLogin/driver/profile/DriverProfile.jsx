import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
import profileIcon from "../../../../assets/icons/afterLogin/navbar/profile.svg"
import verifyIcon from "../../../../assets/icons/afterLogin/driver/verify.svg"
import validationIcon from "../../../../assets/icons/afterLogin/driver/validation.svg"
import customerIcon from "../../../../assets/icons/afterLogin/driver/Customer.svg"
import truckIcon from "../../../../assets/icons/afterLogin/driver/Truck.svg"
import trendIcon from "../../../../assets/icons/afterLogin/driver/Trend-Up.svg"
import swapIcon from "../../../../assets/icons/afterLogin/driver/Swap.svg"
import mealIcon from "../../../../assets/icons/afterLogin/driver/Meal.svg"
import DeliveredCard from '../../../../components/afterLogin/driver/profile/DeliveredCard';
import AchievementsCard from '../../../../components/afterLogin/badges/AchievementsCard';
import { getUser } from '../../../../utils/auth';
import { getDriverStatistics, getDriverCompletedDeliveries } from '../../../../services/donationApi';
import "./DriverProfile.css";

function DriverProfile() {
    const [profile, setProfile] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [completedDeliveries, setCompletedDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setProfile(getUser());
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [statsResponse, completedResponse] = await Promise.all([
                    getDriverStatistics(),
                    getDriverCompletedDeliveries(),
                ]);
                if (statsResponse?.success && statsResponse.statistics) {
                    setStatistics(statsResponse.statistics);
                }
                if (completedResponse?.success && completedResponse.deliveries) {
                    setCompletedDeliveries(completedResponse.deliveries.slice(0, 10));
                }
            } catch (err) {
                console.error('[DriverProfile] Error fetching data:', err);
                setError(err.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const joinedDate = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';
    const displayName = profile?.driverName || profile?.email || 'Driver';
    const vehicleDisplay = profile?.vehicleType
        ? `${profile.vehicleType}${profile?.vehicleNumber ? ` • ${profile.vehicleNumber}` : ''}`
        : (profile?.vehicleNumber ? profile.vehicleNumber : '—');

    const formatTrend = (trend) => {
        if (trend == null || trend === undefined) return '+0%';
        const sign = trend >= 0 ? '+' : '';
        return `${sign}${trend}%`;
    };

    return (
        <>
            <DriverNavbar />

            <div className="driver__profile__page">
                <div className="driver__profile__s1">
                    <div className='driver__profile__s1__sub1'>
                        <img
                            src={profile?.profileImageUrl || profileIcon}
                            alt="Profile"
                            className="driver__profile__avatar"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = profileIcon;
                            }}
                        />
                        <div className='driver__profile__s1__sub1__sub'>
                            <h1>{displayName}</h1>
                            <p>Volunteer Driver{joinedDate ? ` • Joined ${joinedDate}` : ''}</p>
                            <Link to="/driver/edit-profile"><button>Edit</button></Link>
                        </div>
                    </div>
                    <div className='driver__profile__s1__sub2'>
                        <div className='driver__profile__s1__sub2__sub1'>
                            <img src={verifyIcon} alt="verification" />
                            <h5>Verification</h5>
                        </div>
                        <div className='driver__profile__s1__sub2__sub2'>
                            <img src={validationIcon} alt="validation" />
                            <div className='driver__profile__s1__sub2__sub2__sub'>
                                <h2>NIC Verified</h2>
                                <p>Identity Confirmed</p>
                            </div>
                        </div>
                        <div className='driver__profile__s1__sub2__sub2'>
                            <img src={validationIcon} alt="validation" />
                            <div className='driver__profile__s1__sub2__sub2__sub'>
                                <h2>License Valid</h2>
                                <p>Driver License</p>
                                <p>{vehicleDisplay}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='driver__profile__s2'>
                    <div className='driver__profile__s2__sub1'>
                        <div className='driver__profile__s2__sub1__sub1'>
                            <div className='driver__profile__s2__sub1__sub1__sub'>
                                <img src={customerIcon} alt="Customer-Icon" />
                                <h2>Personal Information</h2>
                            </div>
                            <h3>Email</h3>
                            <p>{profile?.email ?? '—'}</p>
                            <h3>Contact No</h3>
                            <p>{profile?.contactNo ?? '—'}</p>
                            <h3>Address</h3>
                            <p>{profile?.address ?? '—'}</p>
                        </div>
                        <div className='driver__profile__s2__sub1__badges'>
                            {statistics?.badgeProgress ? (
                                <AchievementsCard badgeProgress={statistics.badgeProgress} unitLabel="deliveries" />
                            ) : (
                                <div className="driver__profile__s2__sub1__badges__loading">
                                    <h2>Awards and Achievements</h2>
                                    <p>{loading ? 'Loading...' : 'Complete deliveries to earn badges.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className='driver__profile__s2__sub2'>
                        <div className='driver__profile__s2__sub2__sub1'>
                            <div className='driver__profile__s2__sub2__sub1__sub'>
                                <div className='driver__profile__s2__sub2__sub1__sub__sub1'>
                                    <h5>Deliveries Completed</h5>
                                    <img src={truckIcon} alt="truck" />
                                </div>
                                <h1>{loading ? '—' : (statistics?.totalDeliveriesCompleted ?? '—')}</h1>
                                <div className='driver__profile__s2__sub2__sub1__sub__sub2'>
                                    <img src={trendIcon} alt="trend" />
                                    <p>{formatTrend(statistics?.deliveriesTrend)} this month</p>
                                </div>
                            </div>
                            <div className='driver__profile__s2__sub2__sub1__sub' style={{ flex: 1 }}>
                                <div className='driver__profile__s2__sub2__sub1__sub__sub1'>
                                    <h5>Distance (km)</h5>
                                    <img src={swapIcon} alt="truck" />
                                </div>
                                <h1>{loading ? '—' : (statistics?.totalDistanceTravelledFormatted ?? '—')}</h1>
                                <div className='driver__profile__s2__sub2__sub1__sub__sub2'>
                                    <img src={trendIcon} alt="trend" />
                                    <p>{formatTrend(statistics?.distanceTrend)} this month</p>
                                </div>
                            </div>
                            <div className='driver__profile__s2__sub2__sub1__sub' style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                                <div className='driver__profile__s2__sub2__sub1__sub__sub1'>
                                    <h5>Total Earnings</h5>
                                    <img src={trendIcon} alt="meal" style={{ filter: 'hue-rotate(140deg)' }} />
                                </div>
                                <h1 style={{ color: '#1F4E36' }}>LKR {loading ? '—' : (statistics?.totalEarnings?.toLocaleString() ?? '—')}</h1>
                                <div className='driver__profile__s2__sub2__sub1__sub__sub2'>
                                    <img src={trendIcon} alt="trend" />
                                    <p>{formatTrend(statistics?.earningsTrend)} this month</p>
                                </div>
                            </div>
                        </div>
                        <div className='driver__profile__s2__sub2__sub2'>
                            <div className='driver__profile__s2__sub2__sub2__sub1'>
                                <h2>Recent Missions</h2>
                                <p>View All</p>
                            </div>
                            <div className='driver__profile__s2__sub2__sub2__sub2'>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : error ? (
                                    <p>{error}</p>
                                ) : completedDeliveries.length === 0 ? (
                                    <p>No recent missions yet.</p>
                                ) : (
                                    completedDeliveries.slice(0, 2).map((donation) => (
                                        <DeliveredCard key={donation.id} donation={donation} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DriverFooter />
        </>
    )

}

export default DriverProfile;