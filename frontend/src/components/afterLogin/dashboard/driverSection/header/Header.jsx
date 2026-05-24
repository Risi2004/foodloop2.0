import { Link } from "react-router-dom";
import headerImage1 from "../../../../../assets/images/home-page/driver/driver-header1.svg"
import headerImage2 from "../../../../../assets/images/home-page/donor/donor-header2.svg"
import camera from "../../../../../assets/icons/afterLogin/header-image/delivery.svg"
import './Header.css'

function Header() {
    return (
        <div className="header">
            <img className="header__image2" src={headerImage2} alt="Header-2" />
            <div className="header__s1">
                <div className="header__s1__caption">
                    <h1>Empowering Communities</h1>
                    <h1>through Nutritious Surplus</h1>
                    <p>Access a reliable stream of high-quality nutrition to serve your community and reduce operational costs.</p>
                    <div className="header__s1__btns">
                        <Link to="/driver/delivery" className="header__s1__btn">
                            <img src={camera} alt="camera-icon" />
                            <p>Pick Orders</p>
                        </Link>
                    </div>

                </div>
                <img className="header__image1" src={headerImage1} alt="Header-1" />
            </div>

        </div>
    )
}

export default Header;