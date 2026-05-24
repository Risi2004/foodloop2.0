import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Feedback from "../../../../components/afterLogin/dashboard/common/feedback/Feedback";
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import FunctionsSection from "../../../../components/afterLogin/dashboard/donorSection/functionsSection/FunctionsSection";
import Header from "../../../../components/afterLogin/dashboard/donorSection/header/Header";
import Map from "../../../../components/afterLogin/dashboard/donorSection/map/DonorMap";
import Contact from "../../../../components/beforeLogin/Contact/Contact";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";
import Chatbot from "../../../../components/chatbot/Chatbot";
import "./DonorDashboard.css";
import StatusBatchCard from "../../../../components/afterLogin/dashboard/common/statusBatchCard/StatusBatchCard";

function DonorDashboard() {
    const { hash } = useLocation();
    useEffect(() => {
        if (hash === '#contact') {
            const el = document.getElementById('contact');
            if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }, [hash]);

    return (
        <div className="dashboard__page">
            <DonorNavbar />
            <Chatbot />
            <Header />
            <FunctionsSection />
            <Feedback />
            <Map />
            <StatusBatchCard />
            <Contact />
            <DonorFooter />
        </div>
    )
}

export default DonorDashboard;