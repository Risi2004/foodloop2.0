import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Feedback from "../../../../components/afterLogin/dashboard/common/feedback/Feedback";
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import FunctionsSection from "../../../../components/afterLogin/dashboard/donorSection/functionsSection/FunctionsSection";
import Header from "../../../../components/afterLogin/dashboard/donorSection/header/Header";
import Map from "../../../../components/afterLogin/dashboard/donorSection/map/DonorMap";
import Contact from "../../../../components/beforeLogin/Contact/Contact";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";
import "./DonorDashboard.css";
import StatusBatchCard from "../../../../components/afterLogin/dashboard/common/statusBatchCard/StatusBatchCard";
import SupplierSubscriptionPlans from "../../../../components/afterLogin/dashboard/donorSection/subscriptionPlans/SupplierSubscriptionPlans";

function DonorDashboard() {
    const { hash } = useLocation();
    useEffect(() => {
        if (hash === '#contact') {
            const el = document.getElementById('contact');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const t1 = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
                const t2 = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 800);
                return () => {
                    clearTimeout(t1);
                    clearTimeout(t2);
                };
            }
        }
    }, [hash]);

    return (
        <div className="dashboard__page">
            <DonorNavbar />
            <Header />
            <FunctionsSection />
            <Feedback />
            <Map />
            <StatusBatchCard />
            <SupplierSubscriptionPlans />
            <Contact />
            <DonorFooter />
        </div>
    )
}

export default DonorDashboard;