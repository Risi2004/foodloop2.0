import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import FunctionsSection from '../../../../components/afterLogin/dashboard/driverSection/functionsSection/FunctionsSection';
import Header from '../../../../components/afterLogin/dashboard/driverSection/header/Header';
import DriverNavbar from '../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar';
import Feedback from "../../../../components/afterLogin/dashboard/common/feedback/Feedback";
import Map from "../../../../components/afterLogin/dashboard/driverSection/map/DriverMap";
import Contact from "../../../../components/beforeLogin/Contact/Contact";
import Chatbot from '../../../../components/chatbot/Chatbot';
import StatusBatch from "../../../../components/afterLogin/dashboard/driverSection/driverStatusBatch/DriverStatusBatch";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
import './DriverDashboard.css';

function DriverDashboard(){
    const { hash } = useLocation();
    useEffect(() => {
        if (hash === '#contact') {
            const el = document.getElementById('contact');
            if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }, [hash]);

    return (
        <div className='driver__dashboard'>
            <DriverNavbar />
            <Chatbot />
            <Header />
            <FunctionsSection />
            <Feedback />
            <Map />
            <StatusBatch />
            <Contact />
            <DriverFooter />
        </div>
    )
}

export default DriverDashboard;