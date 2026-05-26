import { formatListingPrice } from '../../../utils/donationDisplay';

const ListingPriceLine = ({ donation, className = 'listing-price-line' }) => {
  const price = formatListingPrice(donation);
  if (!price) return null;
  return (
    <div className={className}>
      Price: <strong>{price}</strong>
    </div>
  );
};

export default ListingPriceLine;
