import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";  
import TermsAndConditions from "../../../../components/beforeLogin/TermsAndConditions/TermsAndConditions"
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
function DriverTermsAndConditions() {
    return (
        <>
            <DriverNavbar />
            <TermsAndConditions />
            <DriverFooter />
        </>
    )
}

export default DriverTermsAndConditions;