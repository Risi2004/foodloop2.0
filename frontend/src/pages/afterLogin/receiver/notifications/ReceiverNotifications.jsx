import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import Notifications from "../../../../components/afterLogin/notifications/Notifications";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";


function ReceiverNotifications() {
    return (
        <>
            <ReceiverNavbar />
            <Notifications />
            <ReceiverFooter />
        </>
    )
}

export default ReceiverNotifications;