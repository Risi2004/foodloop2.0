import breakableIcon from '../../../../../assets/impact-receipt/Breakable.svg';
import './ReceiptInfo.css';

const ReceiptInfo = ({ donor, receiver, deliveryDate, receipt }) => {
    const donorName = donor?.name || 'Donor';
    const donorEmail = donor?.email || '';
    const receiverName = receiver?.name || 'Receiver';
    const dropLocation = receipt?.dropLocation || receiver?.address || '—';

    return (
        <div className="receipt-info-container">
            <div className="info-block donor-info">
                <span className="info-label">Donor Information</span>
                <h2 className="info-name">{donorName}</h2>
                {donorEmail && (
                    <a href={`mailto:${donorEmail}`} className="info-email">{donorEmail}</a>
                )}
            </div>

            <div className="info-block org-info">
                <span className="info-label text-right">Handling Organization</span>
                <h2 className="info-name text-right">{receiverName}</h2>
                {deliveryDate && (
                    <div className="delivery-time text-right">Delivered: {deliveryDate}</div>
                )}

                <div className="location-badge">
                    <div className="icon-box">
                        <img src={breakableIcon} alt="" className="location-icon-img" />
                    </div>
                    <div className="location-text">
                        <span className="location-label">Drop Location</span>
                        <span className="location-detail">{dropLocation}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptInfo;
