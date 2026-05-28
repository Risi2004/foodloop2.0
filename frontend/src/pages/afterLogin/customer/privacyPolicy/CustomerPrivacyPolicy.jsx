import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import PrivacyPolicy from '../../../../components/beforeLogin/privacyPolicy/PrivacyPolicy';

function CustomerPrivacyPolicy() {
  return (
    <CustomerPageLayout>
      <div className="customer-page customer-legal-page">
        <header className="customer-page-hero">
          <h1>Privacy Policy</h1>
          <p>How FoodLoop protects and uses your information</p>
        </header>
        <div className="customer-panel customer-legal-content">
          <PrivacyPolicy />
        </div>
      </div>
    </CustomerPageLayout>
  );
}

export default CustomerPrivacyPolicy;
