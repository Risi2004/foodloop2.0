import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import PrivacyPolicy from "../../../../components/beforeLogin/privacyPolicy/PrivacyPolicy";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";


function ReceiverPrivacyPolicy() {
    return (
        <>
        <ReceiverNavbar />
        <PrivacyPolicy />
        <ReceiverFooter />
        </>
    )
}

export default ReceiverPrivacyPolicy;