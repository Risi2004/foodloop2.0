import vehicleIcon from "../../../../../assets/icons/afterLogin/driver/scooter.svg";
import defaultProfileIcon from "../../../../../assets/icons/afterLogin/navbar/profile.svg";
import './DriverDetails.css';

function DriverDetails({ tracking, driverProfileImageUrl }) {
    const isCustomerOrder = tracking?.donation?.sourceType === 'customer_order';
    const donorName = tracking?.donor?.name ?? 'Supplier';
    const donorContact = tracking?.donor?.contactNo || tracking?.donor?.email || '';
    const donorAddress =
        tracking?.donor?.address ||
        tracking?.donation?.pickupAddress ||
        tracking?.donation?.donorAddress ||
        '';
    const receiverName = tracking?.receiver?.name ?? 'Receiver';
    const receiverAddress =
        tracking?.receiver?.address || tracking?.donation?.receiverAddress || '';
    const vehicleType = tracking?.driver?.vehicleType ?? 'Scooter';
    const vehicleNumber = tracking?.driver?.vehicleNumber ?? '—';
    const profileSrc = driverProfileImageUrl || defaultProfileIcon;

    return (
        <div className='driver__details'>
            <div className='driver__details__s1'>
                <div className="driver__details__s1__sub1">
                    <img src={vehicleIcon} alt="Vehicle" />
                    <div className="driver__details__s1__sub1__sub">
                        <h5>Current Location</h5>
                        <p>{isCustomerOrder ? `Pickup for ${receiverName}` : `Pickup at ${donorName}`}</p>
                        {donorAddress ? (
                            <p className="driver__details__address">{donorAddress}</p>
                        ) : null}
                        <p className="driver__details__contact">
                            Contact: {donorContact ? (
                                /^[\d\s+()-]+$/.test(donorContact.trim()) ? (
                                    <a href={`tel:${donorContact.trim()}`}>{donorContact}</a>
                                ) : (
                                    donorContact
                                )
                            ) : (
                                '—'
                            )}
                        </p>
                    </div>
                </div>
                <div className="driver__details__s1__sub2">
                    <img
                        src={profileSrc}
                        alt="Profile"
                        onError={(e) => { e.target.src = defaultProfileIcon; }}
                        className="driver__details__profile-img"
                    />
                    <p>{receiverName}</p>
                    {receiverAddress ? (
                        <p className="driver__details__address">{receiverAddress}</p>
                    ) : null}
                </div>
            </div>
            <div className="driver__details__s2">
                <div className="driver__details__s2__sub1">
                    <img src={vehicleIcon} alt="Vehicle" />
                    <div className="driver__details__s1__sub1__sub">
                        <h5>Vehicle Type</h5>
                        <p>{vehicleType}</p>
                    </div>
                </div>
                <div className="driver__details__s1__sub2">
                    <h5>Vehicle Number</h5>
                    <p>{vehicleNumber}</p>
                </div>
            </div>
        </div>
    )
}


export default DriverDetails;