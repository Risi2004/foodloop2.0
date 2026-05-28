import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import './DigitalReceipt.css';
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter"
import SuccessBanner from '../../../../components/afterLogin/donor/digitalReceipt/SuccessBanner/SuccessBanner';
import ReceiptInfo from '../../../../components/afterLogin/donor/digitalReceipt/ReceiptInfo/ReceiptInfo';
import ImpactCards from '../../../../components/afterLogin/donor/digitalReceipt/ImpactCards/ImpactCards';
import FoodSummary from '../../../../components/afterLogin/donor/digitalReceipt/FoodSummary/FoodSummary';
import DriverSummary from '../../../../components/afterLogin/donor/digitalReceipt/DriverSummary/DriverSummary';
import ActionButtons from '../../../../components/afterLogin/donor/digitalReceipt/ActionButtons/ActionButtons';
import { getDonorReceiptView } from '../../../../services/donationApi';
import { onImpactReceiptUpdated } from '../../../../services/socket';

const DigitalReceipt = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const donationId = searchParams.get('donationId');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!donationId || donationId === 'undefined' || donationId.trim() === '') {
            setLoading(false);
            navigate('/supplier/my-donation');
            return;
        }
        let cancelled = false;

        const loadReceipt = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await getDonorReceiptView(donationId);
                if (!cancelled) setData(res);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load receipt');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        // Initial load
        loadReceipt();

        // Listen for impact receipt updates from receiver; refresh only this donation's data
        const unsubscribe = onImpactReceiptUpdated((payload) => {
            if (payload?.donationId === donationId) {
                loadReceipt();
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [donationId, navigate]);

    if (loading || !donationId) {
        return (
            <>
                <DonorNavbar />
                <div className="digital-receipt-container">
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <p style={{ color: '#1F4E36', fontSize: '16px' }}>Loading receipt...</p>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    if (error && !data) {
        return (
            <>
                <DonorNavbar />
                <div className="digital-receipt-container">
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <p style={{ color: '#c53030', marginBottom: '16px' }}>{error}</p>
                        <Link to="/supplier/my-donation" style={{ color: '#1F4E36', fontWeight: 600 }}>Go to My Listings</Link>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    const { donation, donor, receiver, driver, deliveryDate, receipt } = data || {};

    return (
        <>
        <DonorNavbar />
            <div className="digital-receipt-container">
                <div className="receipt-content">
                    <SuccessBanner deliveryDate={deliveryDate} />

                    <div className="receipt-details-card">
                        <ReceiptInfo donor={donor} receiver={receiver} deliveryDate={deliveryDate} receipt={receipt} />

                        <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#666', marginBottom: '15px' }}>IMPACT SUMMARY</h3>
                        <div style={{ width: '100%', height: '1px', backgroundColor: '#e0e0e0', marginBottom: '20px', marginTop: '-20px', opacity: 0.5 }}></div>

                        <ImpactCards receipt={receipt} />

                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '20px', marginTop: '30px' }}>Delivery Information</h3>

                        <div className="bottom-summary-section">
                            <FoodSummary donation={donation} driver={driver} />
                            <DriverSummary donation={donation} driver={driver} receipt={receipt} />
                        </div>

                        <ActionButtons donationId={donationId} receipt={receipt} />
                    </div>
                </div>
            </div>
            <DonorFooter />
        </>
    );
};

export default DigitalReceipt;
