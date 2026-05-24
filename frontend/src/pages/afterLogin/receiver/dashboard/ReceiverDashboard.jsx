import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar"
import Header from "../../../../components/afterLogin/dashboard/ReceiverSection/header/Header";
import Feedback from "../../../../components/afterLogin/dashboard/common/feedback/Feedback";
import Contact from "../../../../components/beforeLogin/Contact/Contact";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import Map from "../../../../components/afterLogin/dashboard/ReceiverSection/map/ReceiverMap";
import Chatbot from "../../../../components/chatbot/Chatbot";
import './ReceiverDashboard.css';
import FunctionsSection from "../../../../components/afterLogin/dashboard/ReceiverSection/functionsSection/FunctionsSection";

function ReceiverDashboard() {
    const { hash } = useLocation();
    useEffect(() => {
        if (hash === '#contact') {
            const el = document.getElementById('contact');
            if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }, [hash]);

    return (
        <div className="receiver__dashboard">
            <ReceiverNavbar />
            <Chatbot />
            <Header />
            <FunctionsSection />
            <Feedback />
            <Map />
            <Contact />
            <ReceiverFooter />
        </div>
    )
}

export default ReceiverDashboard;