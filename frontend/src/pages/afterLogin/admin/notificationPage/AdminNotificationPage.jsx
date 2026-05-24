import "./AdminNotificationPage.css";
import AdminSideNavbar from "../../../../components/afterLogin/admin/navbar/AdminSideNavbar";
import AdminNotification from "../../../../components/afterLogin/admin/notification/AdminNotification";

const AdminNotificationPage = () => {
  return (
    <div className="admin__notification__page">
      <AdminSideNavbar/>
      <AdminNotification />
    </div>
  );
};

export default AdminNotificationPage;


