import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import './DigitalReceipt.css';
import DonorNavbar from '../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar';
import DonorFooter from '../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter';
import ReceiverNavbar from '../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar';
import ReceiverFooter from '../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter';
import CustomerNavbar from '../../../../components/afterLogin/dashboard/customerSection/navbar/CustomerNavbar';
import CustomerFooter from '../../../../components/afterLogin/dashboard/customerSection/footer/CustomerFooter';
import DriverNavbar from '../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar';
import DriverFooter from '../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter';
import SuccessBanner from '../../../../components/afterLogin/donor/digitalReceipt/SuccessBanner/SuccessBanner';
import ReceiptInfo from '../../../../components/afterLogin/donor/digitalReceipt/ReceiptInfo/ReceiptInfo';
import ImpactCards from '../../../../components/afterLogin/donor/digitalReceipt/ImpactCards/ImpactCards';
import FoodSummary from '../../../../components/afterLogin/donor/digitalReceipt/FoodSummary/FoodSummary';
import DriverSummary from '../../../../components/afterLogin/donor/digitalReceipt/DriverSummary/DriverSummary';
import ActionButtons from '../../../../components/afterLogin/donor/digitalReceipt/ActionButtons/ActionButtons';
import { getDonorReceiptView } from '../../../../services/donationApi';
import { onImpactReceiptUpdated } from '../../../../services/socket';
import { getUser, isDonorDashboardRole } from '../../../../utils/auth';

function resolveReceiptShell(user) {
    const role = (user?.role || '').toLowerCase();

    if (role === 'receiver') {
        return {
            Navbar: ReceiverNavbar,
            Footer: ReceiverFooter,
            backPath: '/receiver/my-claims',
            backLabel: 'Go to My Claims',
        };
    }
    if (role === 'customer') {
        return {
            Navbar: CustomerNavbar,
            Footer: CustomerFooter,
            backPath: '/customer/order-tracking',
            backLabel: 'Go to Order Tracking',
        };
    }
    if (role === 'driver') {
        return {
            Navbar: DriverNavbar,
            Footer: DriverFooter,
            backPath: '/driver/my-pickups',
            backLabel: 'Go to My Pickups',
        };
    }
    if (isDonorDashboardRole(user?.role) || role === 'donor') {
        return {
            Navbar: DonorNavbar,
            Footer: DonorFooter,
            backPath: '/supplier/my-donation',
            backLabel: 'Go to My Listings',
        };
    }

    return {
        Navbar: DonorNavbar,
        Footer: DonorFooter,
        backPath: '/supplier/my-donation',
        backLabel: 'Go to My Listings',
    };
}

const DigitalReceipt = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const donationId = searchParams.get('donationId');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const shell = useMemo(() => resolveReceiptShell(getUser()), []);
    const { Navbar, Footer, backPath, backLabel } = shell;

    useEffect(() => {
        if (!donationId || donationId === 'undefined' || donationId.trim() === '') {
            setLoading(false);
            navigate(backPath);
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

        loadReceipt();

        const unsubscribe = onImpactReceiptUpdated((payload) => {
            if (payload?.donationId === donationId) {
                loadReceipt();
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [donationId, navigate, backPath]);

    const layout = (content) => (
        <>
            <Navbar />
            {content}
            <Footer />
        </>
    );

    if (loading || !donationId) {
        return layout(
            <div className="digital-receipt-container">
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <p style={{ color: '#1F4E36', fontSize: '16px' }}>Loading receipt...</p>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return layout(
            <div className="digital-receipt-container">
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <p style={{ color: '#c53030', marginBottom: '16px' }}>{error}</p>
                    <Link to={backPath} style={{ color: '#1F4E36', fontWeight: 600 }}>{backLabel}</Link>
                </div>
            </div>
        );
    }

    const { donation, donor, receiver, driver, deliveryDate, receipt } = data || {};

    return layout(
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
    );
};

export default DigitalReceipt;
