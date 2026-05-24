import ReviewRequestsTable from './ReviewRequestsTable';
import './ReviewManagement.css';

const ReviewManagement = () => {
    return (
        <div className="review-manage-page">
            <div className="page-header">
                <h1>Review Management</h1>
                <p>Manage, verify, and monitor all user reviews from a centralized platform.</p>
            </div>

            <ReviewRequestsTable />
        </div>
    );
};

export default ReviewManagement;
