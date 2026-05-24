import { useState } from 'react';
import icon1 from "../../../../../assets/icons/afterLogin/feedback/send.svg"
import { submitReview } from '../../../../../services/reviewApi';
import './Feedback.css'

function Feedback() {
    const [reviewText, setReviewText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!reviewText.trim()) {
            setError('Please enter your review');
            return;
        }

        if (reviewText.trim().length > 500) {
            setError('Review must be 500 characters or less');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            setSuccess(false);

            const response = await submitReview(reviewText.trim());

            if (response.success) {
                setSuccess(true);
                setReviewText('');
                // Clear success message after 5 seconds
                setTimeout(() => {
                    setSuccess(false);
                }, 5000);
            }
        } catch (err) {
            console.error('[Feedback] Error submitting review:', err);
            setError(err.response?.data?.message || err.message || 'Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className='feedback'>
            <h1>Tell us what you think about FoodLoop</h1>
            <form onSubmit={handleSubmit}>
                <textarea 
                    name="review" 
                    id="review"
                    value={reviewText}
                    onChange={(e) => {
                        setReviewText(e.target.value);
                        setError(null);
                        setSuccess(false);
                    }}
                    placeholder='Join our tiered donor program and showcase your commitment to the circular economy.'
                    maxLength={500}
                    disabled={submitting}
                />
                {reviewText.length > 0 && (
                    <div style={{ 
                        textAlign: 'right', 
                        marginRight: '10%', 
                        marginTop: '5px', 
                        fontSize: '12px', 
                        color: reviewText.length > 500 ? '#ef4444' : '#666' 
                    }}>
                        {reviewText.length}/500
                    </div>
                )}
                {error && (
                    <div style={{ 
                        color: '#ef4444', 
                        textAlign: 'center', 
                        marginTop: '10px', 
                        fontSize: '14px' 
                    }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{ 
                        color: '#10b981', 
                        textAlign: 'center', 
                        marginTop: '10px', 
                        fontSize: '14px' 
                    }}>
                        ✓ Review submitted successfully! It's under admin review.
                    </div>
                )}
                <br />
                <button type="submit" disabled={submitting || !reviewText.trim()}>
                    <h3>{submitting ? 'Sending...' : 'Send'}</h3>
                    <img src={icon1} alt="send" />
                </button>
            </form>
        </div>
    )
}

export default Feedback;