import icon1 from "../../../../../assets/icons/footer/1.svg"
import icon2 from "../../../../../assets/icons/footer/2.svg"
import icon3 from "../../../../../assets/icons/footer/3.svg"
import icon4 from "../../../../../assets/icons/footer/4.svg"
import { Link, useLocation } from "react-router-dom";
import './DriverFooter.css'

function DriverFooter() {
    const location = useLocation();

    const handleHomeClick = (e) => {
        if (location.pathname === '/driver/dashboard') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        <div className='footer__s2__sub'>
                            <h3>Follow Us On</h3>
                            <img src={icon1} alt="whatsapp" />
                            <img src={icon2} alt="facebook" />
                            <img src={icon3} alt="instagram" />
                            <img src={icon4} alt="twitter" />
                        </div>
                    </div>
                    <div className="footer__s3">
                        <h1>Quick Links</h1>
                        <Link to="/driver/dashboard" onClick={handleHomeClick}>Home</Link>
                        <Link to="/driver/about">About Us</Link>
                        <Link to="/driver/dashboard#contact">Contact Us</Link>
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