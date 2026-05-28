import { getDiscountedPriceDetails, formatListingPrice } from '../../../utils/donationDisplay';

const ListingPriceLine = ({ donation, className = 'listing-price-line' }) => {
  const discounted = getDiscountedPriceDetails(donation);
  if (discounted) {
    return (
      <div className={className}>
        Price:{' '}
        {discounted.hasDiscountApplied && (
          <span className="listing-price-line__old">{discounted.previousFormatted}</span>
        )}{' '}
        <strong>{discounted.currentFormatted}</strong>
      </div>
    );
  }
  const price = formatListingPrice(donation);
  if (!price) return null;
  return (
    <div className={className}>
      Price: <strong>{price}</strong>
    </div>
  );
};

export default ListingPriceLine;
