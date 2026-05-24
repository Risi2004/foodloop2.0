import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import Notifications from "../../../../components/afterLogin/notifications/Notifications";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";


function DriverNotifications() {
    return (
        <>
            <DriverNavbar />
            <Notifications />
            <DriverFooter />
        </>
    )
}

export default DriverNotifications;