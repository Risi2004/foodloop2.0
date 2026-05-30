import React, { useState, useEffect, useCallback } from 'react';
import './ReviewManagement.css';
import { getApprovedReviewsAdmin, deleteReview } from '../../../../services/reviewApi';

const PostedReviewsTable = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState({});
  const [viewingReview, setViewingReview] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getApprovedReviewsAdmin();
      setReviews(response.reviews || []);
    } catch (err) {
      console.error('[PostedReviewsTable] Error fetching approved reviews:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load posted reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this posted review? It will be removed from the landing page.')) {
      return;
    }

    try {
      setProcessing((prev) => ({ ...prev, [reviewId]: 'deleting' }));
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setViewingReview(null);
    } catch (err) {
      console.error('[PostedReviewsTable] Error deleting review:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete review');
    } finally {
      setProcessing((prev) => ({ ...prev, [reviewId]: null }));
    }
  };

  if (loading) {
    return (
      <div className="review-card">
        <h2 className="section-title">Posted Reviews</h2>
        <div style={{ textAlign: 'center', padding: '40px', color: '#2E4E3F' }}>
          Loading posted reviews...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-card">
        <h2 className="section-title">Posted Reviews</h2>
        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="review-card">
      <h2 className="section-title">Posted Reviews ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#2E4E3F' }}>
          No approved reviews on the landing page yet.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>USER NAME</th>
                <th style={{ width: '18%' }}>DATE</th>
                <th style={{ width: '22%' }}>ROLE</th>
                <th style={{ width: '32%' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td className="user-cell">
                    <div className="user-name">{review.name}</div>
                  </td>
                  <td className="date-cell">{review.date}</td>
                  <td className="role-cell">
                    <div className="role-main">{review.role}</div>
                    <div className="role-sub">{review.organization}</div>
                  </td>
                  <td className="action-cell">
                    <div className="action-btn-group">
                      <button
                        type="button"
                        className="icon-btn-eye"
                        title="View"
                        onClick={() => setViewingReview(review)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button
                        type="button"
                        className="review-delete-btn"
                        title="Delete"
                        onClick={() => handleDelete(review.id)}
                        disabled={processing[review.id]}
                      >
                        {processing[review.id] === 'deleting' ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingReview && (
        <div
          className="review-modal-overlay"
          onClick={() => setViewingReview(null)}
          onKeyDown={(e) => e.key === 'Escape' && setViewingReview(null)}
          role="presentation"
        >
          <div className="review-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="review-modal-header">
              <h2>Posted Review</h2>
              <button type="button" className="review-modal-close" onClick={() => setViewingReview(null)}>×</button>
            </div>
            <p><strong>Name:</strong> {viewingReview.name}</p>
            <p><strong>Role:</strong> {viewingReview.role}{viewingReview.organization ? ` (${viewingReview.organization})` : ''}</p>
            <p><strong>Date:</strong> {viewingReview.date}</p>
            <div className="review-modal-body">"{viewingReview.reviewText}"</div>
            <div className="review-modal-actions">
              <button
                type="button"
                className="review-delete-btn review-delete-btn--large"
                onClick={() => handleDelete(viewingReview.id)}
                disabled={processing[viewingReview.id]}
              >
                Delete review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostedReviewsTable;
