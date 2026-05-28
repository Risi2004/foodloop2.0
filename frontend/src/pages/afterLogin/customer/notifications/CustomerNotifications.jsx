import CustomerPageLayout from '../../../../components/afterLogin/dashboard/customerSection/layout/CustomerPageLayout';
import Notifications from '../../../../components/afterLogin/notifications/Notifications';

function CustomerNotifications() {
  return (
    <CustomerPageLayout>
      <div className="customer-page customer-notifications-page">
        <header className="customer-page-hero">
          <h1>Notifications</h1>
          <p>Stay updated on your orders and FoodLoop activity</p>
        </header>
        <div className="customer-panel customer-panel--elevated notifications-panel-wrap">
          <Notifications />
        </div>
      </div>
    </CustomerPageLayout>
  );
}

export default CustomerNotifications;
