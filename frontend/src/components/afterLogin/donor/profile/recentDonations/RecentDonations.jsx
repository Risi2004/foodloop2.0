import { Link } from 'react-router-dom';
import './RecentDonations.css';

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mapStatusToDisplay(status) {
    const map = {
        delivered: 'Completed',
        picked_up: 'In Transit',
        assigned: 'In Transit',
        approved: 'Driver not assigned',
        pending: 'Driver not assigned',
        cancelled: 'Cancelled',
    };
    return map[status] || status || 'Driver not assigned';
}

function getStatusClass(displayStatus) {
    switch (displayStatus) {
        case 'Completed': return 'status-completed';
        case 'In Transit': return 'status-transit';
        case 'Driver not assigned': return 'status-pending';
        case 'Pending': return 'status-pending';
        case 'Cancelled': return 'status-pending';
        default: return '';
    }
}

function RecentDonations({ donations = [] }) {
    const recentList = donations.slice(0, 10);

    return (
        <div className="recent-donations-section">
            <div className="section-header">
                <h3>Recent Donations</h3>
                <Link to="/donor/my-donation" className="view-all-btn">View All</Link>
            </div>

            <div className="donations-table-container">
                <table className="donations-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>ITEMS</th>
                            <th style={{ width: '20%' }}>DATE</th>
                            <th style={{ width: '20%' }}>QUANTITY</th>
                            <th style={{ width: '30%', textAlign: 'right' }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentList.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="no-donations">No donations yet. Create your first donation!</td>
                            </tr>
                        ) : (
                            recentList.map((d) => {
                                const displayStatus = mapStatusToDisplay(d.status);
                                return (
                                    <tr key={d.id}>
                                        <td className="item-name">{d.itemName || '—'}</td>
                                        <td className="item-date">{formatDate(d.createdAt)}</td>
                                        <td className="item-quantity">{d.quantity ?? '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                                                <span className="status-dot">•</span> {displayStatus}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default RecentDonations;
