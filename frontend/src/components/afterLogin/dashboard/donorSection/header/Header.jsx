import headerImage1 from "../../../../../assets/images/home-page/donor/donor-header1.svg"
import headerImage2 from "../../../../../assets/images/home-page/donor/donor-header2.svg"
import camera from "../../../../../assets/icons/afterLogin/header-image/camera.svg";
import { useNavigate } from "react-router-dom";
import './Header.css'

function Header() {
    const navigate = useNavigate();
    return (
        <div className="header">
            <img className="header__image2" src={headerImage2} alt="Header-2" />
            <div className="header__s1">
                <div className="header__s1__caption">
                    <h1>Turn Your Surplus into</h1>
                    <h1>Social Impact</h1>
                    <p>FoodLoop uses AI-powered vision to help restaurants, wedding halls, and supermarkets donate surplus food seamlessly. Close the loop today.</p>
                    <button className="header__s1__btn" onClick={() => navigate('/donor/my-donation')}>
                        <img src={camera} alt="cmaera-icon" />
                        <p>Start Donating With AI</p>
                    </button>
                </div>
                <img className="header__image1" src={headerImage1} alt="Header-1" />
            </div>

        </div>
    )
}

export default Header;