import icon from "../../../assets/icons/review/profile.svg"
import './ReviewCards.css'

function ReviewCards({ name, role, reviewText, image }) {
    return (
        <div className='review__card'>
            <div className="review__image-container">
                <img src={image || icon} alt="profile" className="review__profile-pic" />
            </div>
            <div className="review__content">
                <div className="review__header-row">
                    <h4>{name}</h4>
                    <span className="review__role">{role}</span>
                </div>
                <div className="review__text">
                    <p>“{reviewText}”</p>
                </div>
            </div>
        </div>
    )
}

export default ReviewCards;