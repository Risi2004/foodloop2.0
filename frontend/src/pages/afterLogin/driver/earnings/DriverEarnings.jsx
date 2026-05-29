import DriverNavbar from '../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar';
import DriverFooter from '../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter';
import EarningsPage from '../../shared/earnings/EarningsPage';

function DriverEarnings() {
  return (
    <>
      <DriverNavbar />
      <EarningsPage roleLabel="Driver" variant="driver" />
      <DriverFooter />
    </>
  );
}

export default DriverEarnings;
