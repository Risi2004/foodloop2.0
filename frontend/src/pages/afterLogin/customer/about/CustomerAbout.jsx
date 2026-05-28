import About from "../../../../components/afterLogin/about/About";
import CustomerNavbar from "../../../../components/afterLogin/dashboard/customerSection/navbar/CustomerNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";

function CustomerAbout() {
  return (
    <div className="donor__about__page">
      <CustomerNavbar />
      <About />
      <DonorFooter />
    </div>
  );
}

export default CustomerAbout;
