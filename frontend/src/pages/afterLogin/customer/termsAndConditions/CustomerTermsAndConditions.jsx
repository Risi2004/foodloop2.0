import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import TermsAndConditions from '../../../../components/beforeLogin/TermsAndConditions/TermsAndConditions';

function CustomerTermsAndConditions() {
  return (
    <CustomerPageLayout>
      <div className="customer-page customer-legal-page">
        <header className="customer-page-hero">
          <h1>Terms & Conditions</h1>
          <p>Rules and guidelines for using FoodLoop</p>
        </header>
        <div className="customer-panel customer-legal-content">
          <TermsAndConditions />
        </div>
      </div>
    </CustomerPageLayout>
  );
}

export default CustomerTermsAndConditions;
