import { useState, useEffect } from 'react';
import ReviewCards from './ReviewCards';
import './ReviewSection.css'
import profileIcon from "../../../assets/icons/review/profile.svg"
import { getApprovedReviews } from '../../../services/reviewApi';

function ReviewSection() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await getApprovedReviews();
                
                if (response.success && response.reviews) {
                    setReviews(response.reviews);
                } else {
                    setReviews([]);
                }
            } catch (err) {
                console.error('[ReviewSection] Error fetching reviews:', err);
                setError(err.message || 'Failed to load reviews');
                setReviews([]);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

    // If loading or no reviews, show placeholder or loading state
    if (loading) {
        return (
            <div className='review__section'>
                <div className="review__header">
                    <h1>What Our Community Says</h1>
                    <p>Hear from the people who make the loop possible—donors, volunteers, and partners.</p>
                </div>
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    Loading reviews...
                </div>
            </div>
        );
    }

    if (error || reviews.length === 0) {
        // Fallback to empty state or show error
        return (
            <div className='review__section'>
                <div className="review__header">
                    <h1>What Our Community Says</h1>
                    <p>Hear from the people who make the loop possible—donors, volunteers, and partners.</p>
                </div>
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    {error ? 'Unable to load reviews' : 'No reviews available yet'}
                </div>
            </div>
        );
    }

    // Split reviews for left and right columns
    const leftReviews = reviews.slice(0, Math.ceil(reviews.length / 2));
    const rightReviews = reviews.slice(Math.ceil(reviews.length / 2));

    // Duplicate for seamless scroll only when enough reviews; otherwise show each once
    const MIN_REVIEWS_FOR_LOOP = 4;
    const leftScrollItems = reviews.length >= MIN_REVIEWS_FOR_LOOP ? [...leftReviews, ...leftReviews] : leftReviews;
    const rightScrollItems = reviews.length >= MIN_REVIEWS_FOR_LOOP ? [...rightReviews, ...rightReviews] : rightReviews;
    const allScrollItems = reviews.length >= MIN_REVIEWS_FOR_LOOP ? [...reviews, ...reviews] : reviews;

    return (
        <div className='review__section'>
            <div className="review__header">
                <h1>What Our Community Says</h1>
                <p>Hear from the people who make the loop possible—donors, volunteers, and partners.</p>
            </div>

            <div className="review__scroll-container">
                <div className="review__column review__column--left">
                    <div className="review__track track-up">
                        {leftScrollItems.map((review, index) => (
                            <ReviewCards
                                key={`l-${review.id}-${index}`}
                                name={review.name}
                                role={review.role}
                                reviewText={review.text}
                                image={profileIcon}
                            />
                        ))}
                    </div>
                </div>

                <div className="review__column review__column--right">
                    <div className="review__track track-down">
                        {rightScrollItems.map((review, index) => (
                            <ReviewCards
                                key={`r-${review.id}-${index}`}
                                name={review.name}
                                role={review.role}
                                reviewText={review.text}
                                image={profileIcon}
                            />
                        ))}
                    </div>
                </div>

                <div className="review__column review__column--mobile">
                    <div className="review__track track-up">
                        {allScrollItems.map((review, index) => (
                            <ReviewCards
                                key={`m-${review.id}-${index}`}
                                name={review.name}
                                role={review.role}
                                reviewText={review.text}
                                image={profileIcon}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ReviewSection;