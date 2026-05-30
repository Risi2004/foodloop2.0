import goldBadge from '../../../assets/icons/afterLogin/status-batch/gold.svg';
import './SupplierNameWithPremium.css';

function SupplierNameWithPremium({ name, isPremium = false, className = '' }) {
  if (!name) return null;

  return (
    <span className={`supplier-name-with-premium ${className}`.trim()}>
      <span className="supplier-name-with-premium__name">{name}</span>
      {isPremium && (
        <img
          src={goldBadge}
          alt=""
          className="supplier-name-with-premium__icon"
          title="Premium supplier"
          aria-label="Premium supplier"
        />
      )}
    </span>
  );
}

export default SupplierNameWithPremium;
