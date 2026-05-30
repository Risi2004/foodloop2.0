import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LandingPage from "./pages/beforeLogin/landingPage/LandingPage";
import DonorDashboard from "./pages/afterLogin/donor/dashboard/DonorDashboard"
import LoginPage from "./pages/beforeLogin/loginPage/LoginPage";
import ForgotPasswordPage from "./pages/beforeLogin/forgotPasswordPage/ForgotPasswordPage";
import ResetPasswordPage from "./pages/beforeLogin/resetPasswordPage/ResetPasswordPage";
import SignupPage from "./pages/beforeLogin/signupPage/Signup";
import SignupSelection from "./pages/beforeLogin/signupPage/SignupSelection";
import VerifySignupOtp from "./pages/beforeLogin/verifySignupOtp/VerifySignupOtp";
import ReceiverDashboard from "./pages/afterLogin/receiver/dashboard/ReceiverDashboard"
import DriverDashboard from "./pages/afterLogin/driver/dashboard/DriverDashboard";
import DonorAbout from "./pages/afterLogin/donor/about/DonorAbout";
import ReceiverAbout from "./pages/afterLogin/receiver/about/ReceiverAbout";
import DriverAbout from "./pages/afterLogin/driver/about/DriverAbout";
import LandingPagePrivacyPolicy from "./pages/beforeLogin/privacyPolicy/LandingPagePrivacyPolicy";
import ScrollToTop from "./components/scrollToTop/ScrollToTop";
import DonorPrivacyPolicy from "./pages/afterLogin/donor/privacyPolicy/DonorPrivacyPolicy";
import DriverPrivacyPolicy from "./pages/afterLogin/driver/privacyPolicy/DriverPrivacyPolicy";
import ReceiverPrivacyPolicy from "./pages/afterLogin/receiver/privacyPolicy/ReceiverPrivacyPolicy";
import LandingPageTermsAndConditions from "./pages/beforeLogin/termsAndConditions/LandingPageTermsAndConditions";
import ContactPage from "./pages/beforeLogin/contactPage/ContactPage";
import DonorTermsAndConditions from "./pages/afterLogin/donor/termsAndConditions/DonorTermsAndConditions";
import ReceiverTermsAndConditions from "./pages/afterLogin/receiver/termsAndConditions/ReceiverTermsAndConditions";
import DriverTermsAndConditions from "./pages/afterLogin/driver/termsAndConditions/DriverTermsAndConditions";
import DonorNotifications from "./pages/afterLogin/donor/notifications/DonorNotifications";
import DriverNotifications from "./pages/afterLogin/driver/notifications/DriverNotifications";
import ReceiverNotifications from "./pages/afterLogin/receiver/notifications/ReceiverNotifications";
import ReceiverProfile from "./pages/afterLogin/receiver/profile/ReceiverProfile";
import ReceiverEditProfile from "./pages/afterLogin/receiver/editProfile/ReceiverEditProfile";
import Delivery from "./pages/afterLogin/driver/delivery/Delivery";
import DeliveryConfirmation from "./pages/afterLogin/driver/delivery/DeliveryConfirmation";
import DriverProfile from "./pages/afterLogin/driver/profile/DriverProfile";
import EditProfile from "./pages/afterLogin/driver/editProfile/EditProfile";
import MyPickups from "./pages/afterLogin/driver/myPickups/MyPickups";
import Pickup from "./pages/afterLogin/driver/Pickup/Pickup";
import AdminDashboardPage from "./pages/afterLogin/admin/dashboard/AdminDashboardPage";
import AdminNotificationPage from "./pages/afterLogin/admin/notificationPage/AdminNotificationPage";
import AdminUserManagementPage from "./pages/afterLogin/admin/userManagementPage/AdminUserManagementPage";
import AdminReviewManagementPage from "./pages/afterLogin/admin/reviewManagementPage/ReviewManagementPage";
import AdminMessagesPage from "./pages/afterLogin/admin/messagesPage/AdminMessagesPage";
import DonorProfile from "./pages/afterLogin/donor/profile/DonorProfile";
import DonorEditProfile from "./pages/afterLogin/donor/editProfile/DonorEditProfile";
import DonorMyDontaion from "./pages/afterLogin/donor/myDonation/DonorMyDonation";
import DonorMyDonationDashboard from "./pages/afterLogin/donor/myDonation/DonorMyDonationDashboard";
import DonorEditDonation from "./pages/afterLogin/donor/myDonation/DonorEditDonation";
import DonorTrackingPage from "./pages/afterLogin/donor/trackingPage/DonorTrackingPage";
import DigitalReceipt from "./pages/afterLogin/donor/digitalReceipt/DigitalReceipt";
import IndividualEditProfile from "./pages/afterLogin/donor/individualEditProfile/IndividualEditProfile";
import ReceiverFindFood from "./pages/afterLogin/receiver/findFood/ReceiverFindFood";
import Myclaims from "./pages/afterLogin/receiver/myClaims/MyClaims";
import ReceiverTrackingPage from "./pages/afterLogin/receiver/trackingPage/ReceiverTrackingPage";
import SupplierEarnings from "./pages/afterLogin/donor/earnings/SupplierEarnings";
import SupplierEsgCsrPage from "./pages/afterLogin/donor/esgCsr/SupplierEsgCsrPage";
import DriverEarnings from "./pages/afterLogin/driver/earnings/DriverEarnings";
import AdminPayoutRequestsPage from "./pages/afterLogin/admin/payoutRequests/AdminPayoutRequestsPage";
import AdminOrdersPage from "./pages/afterLogin/admin/orders/AdminOrdersPage";
import AdminUserMonitoringPage from "./pages/afterLogin/admin/userMonitoring/AdminUserMonitoringPage";
import AdminFinancePage from "./pages/afterLogin/admin/finance/AdminFinancePage";
import AdminMaintenancePage from "./pages/afterLogin/admin/maintenance/AdminMaintenancePage";

import CustomerMarketplace from "./pages/afterLogin/customer/marketplace/CustomerMarketplace";
import CustomerCart from "./pages/afterLogin/customer/cart/CustomerCart";
import CustomerPayment from "./pages/afterLogin/customer/payment/CustomerPayment";
import CustomerOrderHistory from "./pages/afterLogin/customer/orderHistory/CustomerOrderHistory";
import CustomerOrderTracking from "./pages/afterLogin/customer/orderTracking/CustomerOrderTracking";
import CustomerProfile from "./pages/afterLogin/customer/profile/CustomerProfile";
import CustomerAbout from "./pages/afterLogin/customer/about/CustomerAbout";
import CustomerNotifications from "./pages/afterLogin/customer/notifications/CustomerNotifications";
import CustomerPrivacyPolicy from "./pages/afterLogin/customer/privacyPolicy/CustomerPrivacyPolicy";
import CustomerTermsAndConditions from "./pages/afterLogin/customer/termsAndConditions/CustomerTermsAndConditions";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import RoleLayout from "./components/afterLogin/RoleLayout/RoleLayout";
import { MarketplaceProvider } from "./contexts/MarketplaceContext";
import { DONOR_DASHBOARD_ROLES } from "./utils/auth";
import { legacyDonorToSupplier } from "./constants/supplierRoutes";
import Chatbot from "./components/chatbot/Chatbot";

const ROUTE_TITLE_MAP = {
  "/": "FoodLoop | Surplus Food Rescue & Community Marketplace",
  "/login": "FoodLoop | Login",
  "/forgot-password": "FoodLoop | Reset Password",
  "/reset-password": "FoodLoop | Reset Password",
  "/signup": "FoodLoop | Select Role & Register",
  "/signup/verify-otp": "FoodLoop | Verify OTP",
  "/privacy-policy": "FoodLoop | Privacy Policy",
  "/terms-&-conditions": "FoodLoop | Terms & Conditions",
  "/contact": "FoodLoop | Contact Us",

  // Supplier / Donor Routes
  "/supplier/dashboard": "FoodLoop | Supplier Dashboard",
  "/supplier/about": "FoodLoop | About Us",
  "/supplier/privacy-policy": "FoodLoop | Privacy Policy",
  "/supplier/terms-&-conditions": "FoodLoop | Terms & Conditions",
  "/supplier/notifications": "FoodLoop | Notifications",
  "/supplier/profile": "FoodLoop | Supplier Profile",
  "/supplier/edit-profile": "FoodLoop | Edit Profile",
  "/supplier/my-donation": "FoodLoop | My Donations",
  "/supplier/new-donation": "FoodLoop | List New Surplus Food",
  "/supplier/track-order": "FoodLoop | Track Orders",
  "/supplier/digital-receipt": "FoodLoop | Digital Receipt",
  "/supplier/individual-edit-profile": "FoodLoop | Edit Profile",
  "/supplier/earnings": "FoodLoop | Supplier Earnings",
  "/supplier/esg-csr": "FoodLoop | ESG & CSR Impact",

  // Receiver Routes
  "/receiver/dashboard": "FoodLoop | Receiver Dashboard",
  "/receiver/about": "FoodLoop | About Us",
  "/receiver/privacy-policy": "FoodLoop | Privacy Policy",
  "/receiver/terms-&-conditions": "FoodLoop | Terms & Conditions",
  "/receiver/notifications": "FoodLoop | Notifications",
  "/receiver/profile": "FoodLoop | Receiver Profile",
  "/receiver/edit-profile": "FoodLoop | Edit Profile",
  "/receiver/find-food": "FoodLoop | Find Food Donations",
  "/receiver/my-claims": "FoodLoop | My Claims",
  "/receiver/track-order": "FoodLoop | Track Claims",

  // Driver Routes
  "/driver/dashboard": "FoodLoop | Driver Dashboard",
  "/driver/about": "FoodLoop | About Us",
  "/driver/privacy-policy": "FoodLoop | Privacy Policy",
  "/driver/terms-&-conditions": "FoodLoop | Terms & Conditions",
  "/driver/notifications": "FoodLoop | Notifications",
  "/driver/delivery": "FoodLoop | Active Deliveries",
  "/driver/delivery-confirmation": "FoodLoop | Delivery Confirmation",
  "/driver/profile": "FoodLoop | Driver Profile",
  "/driver/edit-profile": "FoodLoop | Edit Profile",
  "/driver/my-pickups": "FoodLoop | My Pickups",
  "/driver/pickup": "FoodLoop | Pickup Orders",
  "/driver/earnings": "FoodLoop | Driver Earnings",

  // Admin Routes
  "/admin/dashboard": "FoodLoop | Admin Console",
  "/admin/notification": "FoodLoop | Admin Alerts",
  "/admin/user-management": "FoodLoop | User Management",
  "/admin/reviews": "FoodLoop | Review Approvals",
  "/admin/messages": "FoodLoop | Support Messages",
  "/admin/payout-requests": "FoodLoop | Payout Requests",
  "/admin/orders": "FoodLoop | Order Management",
  "/admin/user-monitoring": "FoodLoop | User Activity Monitor",
  "/admin/finance": "FoodLoop | Financial Analytics",
  "/admin/maintenance": "FoodLoop | System Maintenance",

  // Customer Routes
  "/customer/marketplace": "FoodLoop | Customer Marketplace",
  "/customer/cart": "FoodLoop | Shopping Cart",
  "/customer/payment": "FoodLoop | Secure Checkout",
  "/customer/order-history": "FoodLoop | My Orders",
  "/customer/order-tracking": "FoodLoop | Track Order",
  "/customer/profile": "FoodLoop | Customer Profile",
  "/customer/about": "FoodLoop | About Us",
  "/customer/notifications": "FoodLoop | Notifications",
  "/customer/privacy-policy": "FoodLoop | Privacy Policy",
  "/customer/terms-&-conditions": "FoodLoop | Terms & Conditions",
};

const getDynamicTitle = (pathname) => {
  if (ROUTE_TITLE_MAP[pathname]) {
    return ROUTE_TITLE_MAP[pathname];
  }

  if (pathname.startsWith("/signup/")) {
    const role = pathname.split("/").pop();
    const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
    return `FoodLoop | Signup as ${capitalizedRole}`;
  }

  if (pathname.startsWith("/supplier/edit-donation/")) {
    return "FoodLoop | Edit Donation Listing";
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "FoodLoop";

  const formattedSegments = segments
    .filter(segment => !/^[0-9a-fA-F]{24}$/.test(segment) && !/^\d+$/.test(segment))
    .map(segment => {
      return segment
        .replace(/[-_]+/g, " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    });

  if (formattedSegments.length === 0) return "FoodLoop";
  return `FoodLoop | ${formattedSegments.join(" - ")}`;
};

function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    document.title = getDynamicTitle(location.pathname);
  }, [location]);

  return null;
}

function LegacyDonorRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={legacyDonorToSupplier(pathname) + search + hash} replace />;
}

function ProtectedRoleRoute({ allowedRoles }) {
  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={allowedRoles}>
        <RoleLayout />
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
}

function App() {


  return (
    <MarketplaceProvider>
    <Router>
      <TitleManager />
      <ScrollToTop />
      <Chatbot />
      <Routes>
        {/* Before Signin */}

        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/signup" element={<SignupSelection />} />
        <Route path="/signup/:roleType" element={<SignupPage />} />
        <Route path="/signup/verify-otp" element={<VerifySignupOtp />} />
        <Route path="/privacy-policy" element={<LandingPagePrivacyPolicy />} />
        <Route path="/terms-&-conditions" element={<LandingPageTermsAndConditions />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* After Signin - Protected Routes */}

        {/* Supplier routes — Donor role + restaurant / supermarket / business / individual */}
        <Route path="/supplier" element={<ProtectedRoleRoute allowedRoles={DONOR_DASHBOARD_ROLES} />}>
          <Route path="dashboard" element={<DonorDashboard />} />
          <Route path="about" element={<DonorAbout />} />
          <Route path="privacy-policy" element={<DonorPrivacyPolicy />} />
          <Route path="terms-&-conditions" element={<DonorTermsAndConditions />} />
          <Route path="notifications" element={<DonorNotifications />} />
          <Route path="profile" element={<DonorProfile />} />
          <Route path="edit-profile" element={<DonorEditProfile />} />
          <Route path="my-donation" element={<DonorMyDonationDashboard />} />
          <Route path="new-donation" element={<DonorMyDontaion />} />
          <Route path="edit-donation/:donationId" element={<DonorEditDonation />} />
          <Route path="track-order" element={<DonorTrackingPage />} />
          <Route path="digital-receipt" element={<DigitalReceipt />} />
          <Route path="individual-edit-profile" element={<IndividualEditProfile />} />
          <Route path="earnings" element={<SupplierEarnings />} />
          <Route path="esg-csr" element={<SupplierEsgCsrPage />} />
        </Route>

        <Route path="/donor/*" element={<LegacyDonorRedirect />} />

        {/* Receiver Routes - Only accessible by Receiver role */}
        <Route path="/receiver" element={<ProtectedRoleRoute allowedRoles={['Receiver']} />}>
          <Route path="dashboard" element={<ReceiverDashboard />} />
          <Route path="about" element={<ReceiverAbout />} />
          <Route path="privacy-policy" element={<ReceiverPrivacyPolicy />} />
          <Route path="terms-&-conditions" element={<ReceiverTermsAndConditions />} />
          <Route path="notifications" element={<ReceiverNotifications />} />
          <Route path="profile" element={<ReceiverProfile />} />
          <Route path="edit-profile" element={<ReceiverEditProfile />} />
          <Route path="find-food" element={<ReceiverFindFood />} />
          <Route path="digital-receipt" element={<DigitalReceipt />} />
          <Route path="my-claims" element={<Myclaims />} />
          <Route path="track-order" element={<ReceiverTrackingPage />} />
        </Route>

        {/* Driver Routes - Only accessible by Driver role */}
        <Route path="/driver" element={<ProtectedRoleRoute allowedRoles={['Driver']} />}>
          <Route path="dashboard" element={<DriverDashboard />} />
          <Route path="about" element={<DriverAbout />} />
          <Route path="privacy-policy" element={<DriverPrivacyPolicy />} />
          <Route path="terms-&-conditions" element={<DriverTermsAndConditions />} />
          <Route path="notifications" element={<DriverNotifications />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="delivery-confirmation" element={<DeliveryConfirmation />} />
          <Route path="digital-receipt" element={<DigitalReceipt />} />
          <Route path="profile" element={<DriverProfile />} />
          <Route path="edit-profile" element={<EditProfile />} />
          <Route path="my-pickups" element={<MyPickups />} />
          <Route path="pickup" element={<Pickup />} />
          <Route path="earnings" element={<DriverEarnings />} />
        </Route>

        {/* Admin Routes - Only accessible by Admin role */}
        <Route path="/admin" element={<ProtectedRoleRoute allowedRoles={['Admin']} />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="notification" element={<AdminNotificationPage />} />
          <Route path="user-management" element={<AdminUserManagementPage />} />
          <Route path="reviews" element={<AdminReviewManagementPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="payout-requests" element={<AdminPayoutRequestsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="user-monitoring" element={<AdminUserMonitoringPage />} />
          <Route path="finance" element={<AdminFinancePage />} />
          <Route path="maintenance" element={<AdminMaintenancePage />} />
        </Route>

        {/* Customer Routes - Accessible by Customer role */}
        <Route path="/customer" element={<ProtectedRoleRoute allowedRoles={['customer']} />}>
          <Route path="marketplace" element={<CustomerMarketplace />} />
          <Route path="cart" element={<CustomerCart />} />
          <Route path="payment" element={<CustomerPayment />} />
          <Route path="order-history" element={<CustomerOrderHistory />} />
          <Route path="order-tracking" element={<CustomerOrderTracking />} />
          <Route path="digital-receipt" element={<DigitalReceipt />} />
          <Route path="track-order" element={<ReceiverTrackingPage />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="about" element={<CustomerAbout />} />
          <Route path="notifications" element={<CustomerNotifications />} />
          <Route path="privacy-policy" element={<CustomerPrivacyPolicy />} />
          <Route path="terms-&-conditions" element={<CustomerTermsAndConditions />} />
        </Route>

      </Routes>
    </Router >
    </MarketplaceProvider>
  );
}

export default App;