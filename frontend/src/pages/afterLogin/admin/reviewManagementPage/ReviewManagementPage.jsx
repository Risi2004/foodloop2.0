import AdminSideNavbar from "../../../../components/afterLogin/admin/navbar/AdminSideNavbar";
import AdminReviewManagement from "../../../../components/afterLogin/admin/reviews/ReviewManagement";
import './ReviewManagementPage.css'

function ReviewManagementPage(){
    return(
        <div className="review__management__page">
            <AdminSideNavbar />
            <AdminReviewManagement />
        </div>
    )
}

export default ReviewManagementPage;