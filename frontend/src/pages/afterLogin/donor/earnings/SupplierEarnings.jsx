import DonorNavbar from '../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar';
import DonorFooter from '../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter';
import EarningsPage from '../../shared/earnings/EarningsPage';

function SupplierEarnings() {
  return (
    <>
      <DonorNavbar />
      <EarningsPage roleLabel="Supplier" />
      <DonorFooter />
    </>
  );
}

export default SupplierEarnings;
