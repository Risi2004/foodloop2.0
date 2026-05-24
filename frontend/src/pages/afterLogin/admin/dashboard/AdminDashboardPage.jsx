import AdminSideNavbar from "../../../../components/afterLogin/admin/navbar/AdminSideNavbar";
import AdminDashboard from "../../../../components/afterLogin/admin/dashboard/AdminDashboard";
import Chatbot from "../../../../components/chatbot/Chatbot";
import './AdminDashboardPage.css';

function AdminDashboardPage (){
    return(
        <div className="admin__dashboard__page">
            <AdminSideNavbar />
            <AdminDashboard />
            <Chatbot />
        </div>
    )
}

export default AdminDashboardPage;