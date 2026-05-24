import React from 'react';
import liveJourneyIcon from "../../../../../assets/icons/afterLogin/driver/Live-Journey.svg";
import locationIcon from "../../../../../assets/icons/afterLogin/driver/location.svg";
import volunteerIcon from "../../../../../assets/icons/afterLogin/driver/scooter.svg";
import receiverIcon from "../../../../../assets/icons/afterLogin/driver/received.svg";
import trendUpIcon from "../../../../../assets/icons/afterLogin/driver/Trend-Up.svg";
import './LiveJourney.css';

function formatDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function LiveJourney({ tracking, isConfirmed, impactProgress }) {
    const createdAt = tracking?.timestamps?.createdAt;
    const actualPickupDate = tracking?.timestamps?.actualPickupDate;
    const driverName = tracking?.driver?.name ?? 'Driver';
    const status = tracking?.donation?.status;
    const withVolunteer = status === 'picked_up' || isConfirmed;

    const completed = impactProgress?.currentCount ?? 12;
    const nextTarget = impactProgress?.nextBadgeTarget;
    const target = nextTarget != null ? nextTarget : (completed > 0 ? completed : 15);
    const percent = impactProgress?.progressPercentage ?? (target > 0 ? Math.round((completed / target) * 100) : 0);
    const remaining = impactProgress?.remainingForNextBadge ?? 3;

    return (
        <div className="live-journey-card">
            <div className="live-journey-header">
                <img src={liveJourneyIcon} alt="Live Journey" className="header-icon" />
                <h2>Live Journey</h2>
            </div>

            <div className="live-journey-body">
                <img src={trendUpIcon} alt="" className="background-graph" />

                <div className="timeline">
                    <div className="timeline-item">
                        <div className="timeline-marker green">
                            <img src={locationIcon} alt="Location" />
                        </div>
                        <div className="timeline-content">
                            <p className="step-status green-text">Item Listed</p>
                            <h4 className="step-title">Donation confirmed by Donor</h4>
                            <p className="step-meta">{formatDate(createdAt)}</p>
                        </div>
                    </div>

                    <div className={withVolunteer ? 'timeline-item active' : 'timeline-item pending'}>
                        <div className="timeline-connector green-line"></div>
                        <div className="timeline-marker blue">
                            <img src={volunteerIcon} alt="Volunteer" />
                        </div>
                        <div className="timeline-content">
                            <p className="step-status blue-text">With Volunteer</p>
                            <h4 className="step-title">{withVolunteer ? `Picked up by ${driverName}` : 'Pending pickup'}</h4>
                            <p className="step-meta">{withVolunteer ? `${formatDate(actualPickupDate)} • On the way` : 'Confirm when you collect'}</p>
                        </div>
                    </div>

                    <div className="timeline-item pending">
                        <div className="timeline-connector blue-line"></div>
                        <div className="timeline-marker orange">
                            <img src={receiverIcon} alt="Receiver" />
                        </div>
                        <div className="timeline-content">
                            <p className="step-status orange-text">Reached the Needy</p>
                            <h4 className="step-title">{status === 'delivered' ? 'Delivered' : 'Pending Drop-off'}</h4>
                            <p className="step-meta">{status === 'delivered' ? 'Delivery completed' : 'Estimated arrival: 12:45 PM'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="impact-progress">
                <div className="impact-header">
                    <h4>Your Impact Progress</h4>

                </div>

                <div className="progress-container">
                    <div className="progress-labels">
                        <div className="progress-label-left">
                            <span>{completed}/{target} Pickups Completed</span>
                        </div>
                        <span className="progress-percentage">{percent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${Math.min(100, percent)}%` }}></div>
                    </div>
                    <p className="progress-quote">
                        {nextTarget != null && remaining > 0
                            ? `"Just ${remaining} more pickup${remaining === 1 ? '' : 's'} to earn your next badge!"`
                            : '"Keep delivering to make an impact!"'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LiveJourney;