import About from "../../../../components/afterLogin/about/About";
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar"
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";

function ReceiverAbout() {
    return (
        <div className="receiver__about__page">
            <ReceiverNavbar />
            <About />
            <ReceiverFooter />
        </div>
    )
}

export default ReceiverAbout;