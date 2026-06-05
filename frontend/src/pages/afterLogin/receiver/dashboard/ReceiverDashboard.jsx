import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReceiverNavbar from "../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar"
import Header from "../../../../components/afterLogin/dashboard/ReceiverSection/header/Header";
import Feedback from "../../../../components/afterLogin/dashboard/common/feedback/Feedback";
import Contact from "../../../../components/beforeLogin/Contact/Contact";
import ReceiverFooter from "../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter";
import Map from "../../../../components/afterLogin/dashboard/ReceiverSection/map/ReceiverMap";
import './ReceiverDashboard.css';
import FunctionsSection from "../../../../components/afterLogin/dashboard/ReceiverSection/functionsSection/FunctionsSection";

function ReceiverDashboard() {
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
        <div className="receiver__dashboard">
            <ReceiverNavbar />
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