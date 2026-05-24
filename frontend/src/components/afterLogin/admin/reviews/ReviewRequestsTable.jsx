import React, { useState, useEffect } from 'react';
import './ReviewManagement.css';
import { getPendingReviews, approveReview, rejectReview } from '../../../../services/reviewApi';

const ReviewRequestsTable = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState({});
    const [viewingReview, setViewingReview] = useState(null);

    // Fetch pending reviews
    useEffect(() => {
        const fetchPendingReviews = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await getPendingReviews();
                
                if (response.success && response.reviews) {
                    setRequests(response.reviews);
                } else {
                    setRequests([]);
                }
            } catch (err) {
                console.error('[ReviewRequestsTable] Error fetching pending reviews:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load pending reviews');
                setRequests([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPendingReviews();
    }, []);

    // Handle approve
    const handleApprove = async (reviewId) => {
        if (!window.confirm('Are you sure you want to approve this review?')) {
            return;
        }

        try {
            setProcessing({ ...processing, [reviewId]: 'approving' });
            await approveReview(reviewId);
            
            // Remove from list
            setRequests(requests.filter(req => req.id !== reviewId));
            setViewingReview(null);
            
            // Refresh list
            const response = await getPendingReviews();
            if (response.success && response.reviews) {
                setRequests(response.reviews);
            }
        } catch (err) {
            console.error('[ReviewRequestsTable] Error approving review:', err);
            alert(err.response?.data?.message || err.message || 'Failed to approve review');
        } finally {
            setProcessing({ ...processing, [reviewId]: null });
        }
    };

    // Handle reject
    const handleReject = async (reviewId) => {
        const reason = window.prompt('Please provide a reason for rejection:');
        if (!reason || reason.trim() === '') {
            return;
        }

        try {
            setProcessing({ ...processing, [reviewId]: 'rejecting' });
            await rejectReview(reviewId, reason.trim());
            
            // Remove from list
            setRequests(requests.filter(req => req.id !== reviewId));
            setViewingReview(null);
            
            // Refresh list
            const response = await getPendingReviews();
            if (response.success && response.reviews) {
                setRequests(response.reviews);
            }
        } catch (err) {
            console.error('[ReviewRequestsTable] Error rejecting review:', err);
            alert(err.response?.data?.message || err.message || 'Failed to reject review');
        } finally {
            setProcessing({ ...processing, [reviewId]: null });
        }
    };

    // Handle view
    const handleView = (review) => {
        setViewingReview(review);
    };

    // Close view modal
    const closeViewModal = () => {
        setViewingReview(null);
    };

    if (loading) {
        return (
            <div className="review-card">
                <h2 className="section-title">Recent Request</h2>
                <div style={{ textAlign: 'center', padding: '40px', color: '#e0e0e0' }}>
                    Loading pending reviews...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="review-card">
                <h2 className="section-title">Recent Request</h2>
                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="review-card">
            <h2 className="section-title">Recent Request</h2>
            <div className="table-container">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>USER NAME</th>
                            <th style={{ width: '25%' }}>DATE</th>
                            <th style={{ width: '25%' }}>ROLE</th>
                            <th style={{ width: '20%' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.id}>
                                <td className="user-cell">
                                    <div className="user-name">{req.name}</div>
                                </td>
                                <td className="date-cell">{req.date}</td>
                                <td className="role-cell">
                                    <div className="role-main">{req.role}</div>
                                    <div className="role-sub">{req.organization}</div>
                                </td>
                                <td className="action-cell">
                                    <div className="action-btn-group">
                                        <button 
                                            className="icon-btn-square check" 
                                            title="Approve"
                                            onClick={() => handleApprove(req.id)}
                                            disabled={processing[req.id]}
                                            style={{ opacity: processing[req.id] === 'approving' ? 0.6 : 1, cursor: processing[req.id] ? 'not-allowed' : 'pointer' }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </button>
                                        <button 
                                            className="icon-btn-square cross" 
                                            title="Reject"
                                            onClick={() => handleReject(req.id)}
                                            disabled={processing[req.id]}
                                            style={{ opacity: processing[req.id] === 'rejecting' ? 0.6 : 1, cursor: processing[req.id] ? 'not-allowed' : 'pointer' }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                        <button 
                                            className="icon-btn-eye" 
                                            title="View"
                                            onClick={() => handleView(req)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* View Review Modal */}
            {viewingReview && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                }} onClick={closeViewModal}>
                    <div style={{
                        backgroundColor: '#52615D',
                        padding: '30px',
                        borderRadius: '20px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ color: '#ffffff', margin: 0 }}>Review Details</h2>
                            <button 
                                onClick={closeViewModal}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0',
                                    width: '30px',
                                    height: '30px',
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ color: '#e0e0e0', marginBottom: '15px' }}>
                            <strong>Name:</strong> {viewingReview.name}
                        </div>
                        <div style={{ color: '#e0e0e0', marginBottom: '15px' }}>
                            <strong>Role:</strong> {viewingReview.role} {viewingReview.organization && `(${viewingReview.organization})`}
                        </div>
                        <div style={{ color: '#e0e0e0', marginBottom: '15px' }}>
                            <strong>Date:</strong> {viewingReview.date}
                        </div>
                        <div style={{ color: '#e0e0e0', marginBottom: '20px' }}>
                            <strong>Review:</strong>
                            <div style={{ 
                                marginTop: '10px', 
                                padding: '15px', 
                                backgroundColor: '#3d4a46', 
                                borderRadius: '10px',
                                fontStyle: 'italic',
                                lineHeight: '1.6'
                            }}>
                                "{viewingReview.reviewText}"
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    handleReject(viewingReview.id);
                                }}
                                disabled={processing[viewingReview.id]}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: processing[viewingReview.id] ? 'not-allowed' : 'pointer',
                                    opacity: processing[viewingReview.id] ? 0.6 : 1,
                                }}
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => {
                                    handleApprove(viewingReview.id);
                                }}
                                disabled={processing[viewingReview.id]}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: processing[viewingReview.id] ? 'not-allowed' : 'pointer',
                                    opacity: processing[viewingReview.id] ? 0.6 : 1,
                                }}
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewRequestsTable;
