import CustomerNavbar from '../navbar/CustomerNavbar';
import CustomerFooter from '../footer/CustomerFooter';
import '../../../../../pages/afterLogin/customer/customerShell.css';
import '../../../../../pages/afterLogin/customer/customerPages.css';

function CustomerPageLayout({ children, hideFooter = false }) {
  return (
    <div className="customer__shell">
      <CustomerNavbar />
      {children}
      {!hideFooter && <CustomerFooter />}
    </div>
  );
}

export default CustomerPageLayout;
