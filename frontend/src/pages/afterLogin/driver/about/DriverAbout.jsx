import About from "../../../../components/afterLogin/about/About";
import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar"
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";

function DriverAbout() {
    return (
        <div className="driver__about__page">
            <DriverNavbar />
            <About />
            <DriverFooter />
        </div>
    )
}

export default DriverAbout;