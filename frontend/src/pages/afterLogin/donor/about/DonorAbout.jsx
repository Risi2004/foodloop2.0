import About from "../../../../components/afterLogin/about/About";
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar"
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";

function DonorAbout(){
    return(
        <div className="donor__about__page">

            <DonorNavbar />
            <About />
            <DonorFooter />
        </div>
    )
}

export default DonorAbout;