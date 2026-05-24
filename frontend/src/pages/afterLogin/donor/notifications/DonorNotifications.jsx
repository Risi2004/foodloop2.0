import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import Notifications from "../../../../components/afterLogin/notifications/Notifications";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";


function DonorNotifications() {
    return (
        <>
            <DonorNavbar />
            <Notifications />
            <DonorFooter />
        </>
    )
}

export default DonorNotifications;