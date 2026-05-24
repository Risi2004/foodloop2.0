import AdminSideNavbar from "../../../../components/afterLogin/admin/navbar/AdminSideNavbar";
import AdminUserManagement from "../../../../components/afterLogin/admin/userManagement/AdminUserManagement";
import './AdminUserManagementPage.css'

function AdminUserManagementPage(){
    return(
        <div className='admin__user__management__page'>
            <AdminSideNavbar />
            <AdminUserManagement />
        </div>
    )
}

export default AdminUserManagementPage;