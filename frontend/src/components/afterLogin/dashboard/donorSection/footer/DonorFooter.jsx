import { Link, useLocation } from "react-router-dom";
import FooterSocialLinks from "../../../../shared/footer/FooterSocialLinks";
import './DonorFooter.css'

function DonorFooter() {
    const location = useLocation();

    const handleHomeClick = (e) => {
        if (location.pathname === '/supplier/dashboard' || location.pathname === '/donor/dashboard') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleContactClick = (e) => {
        if (location.pathname === '/supplier/dashboard' || location.pathname === '/donor/dashboard') {
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
                        <Link to="/supplier/dashboard" onClick={handleHomeClick}>Home</Link>
                        <Link to="/supplier/about">About Us</Link>
                        <Link to="/supplier/dashboard#contact" onClick={handleContactClick}>Contact Us</Link>
                        <Link to="/supplier/my-donation">My Listings</Link>
                    </div>
                    <div className="footer__s4">
                        <h1>Legal</h1>
                        <Link to="/supplier/privacy-policy">Privacy Policy</Link>
                        <Link to="/supplier/terms-&-conditions">Terms & Conditions</Link>
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

export default DonorFooter;