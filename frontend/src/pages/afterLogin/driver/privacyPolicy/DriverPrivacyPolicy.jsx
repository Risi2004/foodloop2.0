import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import PrivacyPolicy from "../../../../components/beforeLogin/privacyPolicy/PrivacyPolicy";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";

function DriverPrivacyPolicy() {
    return (
        <>
        <DriverNavbar />
        <PrivacyPolicy />
        <DriverFooter />
        </>
    )
}

export default DriverPrivacyPolicy;