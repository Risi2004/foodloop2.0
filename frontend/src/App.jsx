import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import ReceiptForm from "./pages/afterLogin/receiver/receiptForm/ReceiptForm";
import Myclaims from "./pages/afterLogin/receiver/myClaims/MyClaims";
import ReceiverTrackingPage from "./pages/afterLogin/receiver/trackingPage/ReceiverTrackingPage";

import CustomerMarketplace from "./pages/afterLogin/customer/marketplace/CustomerMarketplace";
import CustomerCart from "./pages/afterLogin/customer/cart/CustomerCart";
import CustomerPayment from "./pages/afterLogin/customer/payment/CustomerPayment";
import CustomerProfile from "./pages/afterLogin/customer/profile/CustomerProfile";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleProtectedRoute from "./components/auth/RoleProtectedRoute";
import RoleLayout from "./components/afterLogin/RoleLayout/RoleLayout";
import { MarketplaceProvider } from "./contexts/MarketplaceContext";
import { DONOR_DASHBOARD_ROLES } from "./utils/auth";

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
      <ScrollToTop />
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

        {/* Donor Routes — Donor + restaurant / supermarket / business / individual */}
        <Route path="/donor" element={<ProtectedRoleRoute allowedRoles={DONOR_DASHBOARD_ROLES} />}>
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
        </Route>

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
          <Route path="digital-receipt" element={<ReceiptForm />} />
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
          <Route path="profile" element={<DriverProfile />} />
          <Route path="edit-profile" element={<EditProfile />} />
          <Route path="my-pickups" element={<MyPickups />} />
          <Route path="pickup" element={<Pickup />} />
        </Route>

        {/* Admin Routes - Only accessible by Admin role */}
        <Route path="/admin" element={<ProtectedRoleRoute allowedRoles={['Admin']} />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="notification" element={<AdminNotificationPage />} />
          <Route path="user-management" element={<AdminUserManagementPage />} />
          <Route path="reviews" element={<AdminReviewManagementPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
        </Route>

        {/* Customer Routes - Accessible by Customer role */}
        <Route path="/customer" element={<ProtectedRoleRoute allowedRoles={['customer']} />}>
          <Route path="marketplace" element={<CustomerMarketplace />} />
          <Route path="cart" element={<CustomerCart />} />
          <Route path="payment" element={<CustomerPayment />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

      </Routes>
    </Router >
    </MarketplaceProvider>
  );
}

export default App;