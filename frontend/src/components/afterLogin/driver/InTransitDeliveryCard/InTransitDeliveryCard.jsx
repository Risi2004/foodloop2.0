import { Link } from 'react-router-dom';
import swapIcon from "../../../../assets/icons/afterLogin/driver/Swap.svg";
import dotIcon from "../../../../assets/icons/afterLogin/driver/dot.svg";
import scheduleIcon from "../../../../assets/icons/afterLogin/driver/schedule.svg"
import './InTransitDeliveryCard.css';

function InTransitDeliveryCard({ donation }) {
    if (!donation) {
        return null;
    }

    // Format quantity display
    const formatQuantity = (quantity) => {
        if (!quantity) return 'N/A';
        return `${quantity} ${quantity === 1 ? 'serving' : 'servings'}`;
    };

    // Calculate estimated delivery time (simple calculation based on distance)
    const calculateEstimatedTime = (distance) => {
        if (!distance) return 'Calculating...';
        // Assume average speed of 30 km/h in city
        const timeInMinutes = Math.round((distance / 30) * 60);
        if (timeInMinutes < 1) return 'Less than 1 min';
        if (timeInMinutes === 1) return '1 min';
        return `${timeInMinutes} min`;
    };

    const itemName = donation.itemName || 'Food Item';
    const quantity = donation.quantity || 0;
    const receiverName = donation.receiverName || 'Receiver';
    const distance = donation.driverToReceiverDistanceFormatted || '0 km';
    const estimatedTime = calculateEstimatedTime(donation.driverToReceiverDistance);

    return (
        <div className='transit__delivery__card'>
            <div className='transit__delivery__card__s1'>
                <div className='transit__delivery__card__s1__sub'>
                    <div className='transit__delivery__card__s1__sub1'>
                        <img src={dotIcon} alt="Dot - Icon" />
                        <h4>In Transit</h4>
                    </div>
                    <div className='transit__delivery__card__s1__sub2'>
                        <img src={swapIcon} alt="" />
                        <Link to={`/driver/delivery-confirmation?donationId=${donation.id}`}>
                            <h4>Follow Map</h4>
                        </Link>
                    </div>
                </div>
                <div className='transit__delivery__card__s1__sub3'>
                    <h3>{receiverName}</h3>
                    <p>{distance} Away</p>
                </div>
                <div className='transit__delivery__card__s1__sub4'>
                    <p>{itemName} • {formatQuantity(quantity)}</p>
                    <div className='transit__delivery__card__s1__sub4__sub'>
                        <img src={scheduleIcon} alt="Schedule-Icon" />
                        <p style={{color:"#EF4444"}}>Delivered in {estimatedTime}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InTransitDeliveryCard;