import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import TermsAndConditions from "../../../../components/beforeLogin/TermsAndConditions/TermsAndConditions"
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";

function DonorTermsAndConditions() {
    return (
        <>
            <DonorNavbar />
            <TermsAndConditions />
            <DonorFooter />
        </>
    )
}

export default DonorTermsAndConditions;