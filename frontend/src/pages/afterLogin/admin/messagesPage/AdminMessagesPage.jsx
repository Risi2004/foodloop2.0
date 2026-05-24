import AdminSideNavbar from "../../../../components/afterLogin/admin/navbar/AdminSideNavbar";
import AdminMessages from "../../../../components/afterLogin/admin/messages/AdminMessages";
import './AdminMessagesPage.css';

function AdminMessagesPage(){
    return(
        <div className="admin__messages__page">
            <AdminSideNavbar />
            <AdminMessages />
        </div>
    )
}

export default AdminMessagesPage;