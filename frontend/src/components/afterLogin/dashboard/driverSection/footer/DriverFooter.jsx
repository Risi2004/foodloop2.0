import { Link, useLocation } from "react-router-dom";
import FooterSocialLinks from "../../../../shared/footer/FooterSocialLinks";
import './DriverFooter.css'

function DriverFooter() {
    const location = useLocation();

    const handleHomeClick = (e) => {
        if (location.pathname === '/driver/dashboard') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleContactClick = (e) => {
        if (location.pathname === '/driver/dashboard') {
            e.preventDefault();
            const el = document.getElementById('contact');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
            <>
                <div className='footer'>
                    <div className='footer__s1'>
                        <img src="/logo.png" alt="logo" />
                        <h1><span className="footer__s1__part1">Food</span><span className="footer__s1__part2">Loop</span></h1>
                        <p>Zero Waste. Infinite Impact</p>
                    </div>
                    <div className='footer__s2'>
                        <p>A high-tech, real-time digital ecosystem powered by Artificial Intelligence that bridges the critical gap between food surplus and food scarcity to build a sustainable circular economy</p>
                        <FooterSocialLinks />
                    </div>
                    <div className="footer__s3">
                        <h1>Quick Links</h1>
                        <Link to="/driver/dashboard" onClick={handleHomeClick}>Home</Link>
                        <Link to="/driver/about">About Us</Link>
                        <Link to="/driver/dashboard#contact" onClick={handleContactClick}>Contact Us</Link>
                        <Link to="/driver/delivery">Delivery</Link>
                        <Link to="/driver/my-pickups">My Pickups</Link>
                    </div>
                    <div className="footer__s4">
                        <h1>Legal</h1>
                        <Link to="/driver/privacy-policy">Privacy Policy</Link>
                        <Link to="/driver/terms-&-conditions">Terms & Conditions</Link>
                    </div>
                    <div className="footer__s5">
                        <h1>Designed & Developed</h1>
                        <h1>By</h1>
                        <h1>HyperNova</h1>
                    </div>
                </div>
                <div className="below__footer">
                    <p>&copy; 2026 FoodLoop. All Rights Reserved</p>
                </div>
            </>
    )
}

export default DriverFooter;