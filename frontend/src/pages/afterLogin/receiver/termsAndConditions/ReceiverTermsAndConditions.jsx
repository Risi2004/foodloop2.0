import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar";
import TermsAndConditions from "../../../../components/beforeLogin/TermsAndConditions/TermsAndConditions";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";

function ReceiverTermsAndConditions() {
    return (
        <>
            <ReceiverNavbar />
            <TermsAndConditions />
            <ReceiverFooter />
        </>
    )
}

export default ReceiverTermsAndConditions;