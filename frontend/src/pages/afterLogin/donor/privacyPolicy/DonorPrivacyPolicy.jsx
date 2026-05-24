import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import PrivacyPolicy from "../../../../components/beforeLogin/privacyPolicy/PrivacyPolicy";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter"; 

function DonorPrivacyPolicy() {
    return(
        <>
        <DonorNavbar />
        <PrivacyPolicy />
        <DonorFooter />
        </>
    )
}

export default DonorPrivacyPolicy;