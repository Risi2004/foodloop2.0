import { useNavigate } from 'react-router-dom';
import headerImage1 from "../../../../../assets/images/home-page/receiver/receiver-header1.svg"
import headerImage2 from "../../../../../assets/images/home-page/donor/donor-header2.svg"
import camera from "../../../../../assets/icons/afterLogin/header-image/claim.svg"
import './Header.css'

function Header() {
    const navigate = useNavigate();

    return (
        <div className="header">
            <img className="header__image2" src={headerImage2} alt="Header-2" />
            <div className="header__s1">
                <div className="header__s1__caption">
                    <h1>Empowering Communities</h1>
                    <h1>through Nutritious Surplus</h1>
                    <p>Access a reliable stream of high-quality nutrition to serve your community and reduce operational costs.</p>
                    <div className="header__s1__btns">
                        <button type="button" className="header__s1__btn" onClick={() => navigate('/receiver/find-food')}>
                            <img src={camera} alt="camera-icon" />
                            <p>Claim Food</p>
                        </button>
                        <button type="button" className="header__s1__btn2" onClick={() => navigate('/receiver/find-food')}>
                            <p>View Live Listings</p>
                        </button>
                    </div>

                </div>
                <img className="header__image1" src={headerImage1} alt="Header-1" />
            </div>

        </div>
    )
}

export default Header;