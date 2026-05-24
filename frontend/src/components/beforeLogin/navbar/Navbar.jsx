import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import "./Navbar.css"
import arrow from "../../../assets/icons/navbar/arrow.svg"
import menu from "../../../assets/icons/navbar/menu-bar.svg"

function Navbar({ isLoggedIn: _isLoggedIn }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const isHome = location.pathname === '/';

    const scrollToSection = (sectionId) => {
        if (isHome) {
            const el = document.getElementById(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            navigate(`/#${sectionId}`);
        }
        setIsMenuOpen(false);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    // Lock background scroll when responsive menu is open
    useEffect(() => {
        if (!isMenuOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMenuOpen]);

    return (
        <>
            <div className="navbar">
                <div className="navbar__s1">
                    <img src="/logo.png" alt="logo" />
                    <div className="navbar__s1__sub">
                        <h2> <span className="navbar__s1__sub__part1">Food</span><span className="navbar__s1__sub__part2">Loop</span></h2>
                        <p>Zero Waste. Infinite Impact</p>
                    </div>
                </div>

                <div className="navbar__s2">
                    <Link to="/">Home</Link>
                    <button type="button" className="navbar__link" onClick={() => scrollToSection('about')}>About Us</button>
                    <button type="button" className="navbar__link" onClick={() => scrollToSection('contact')}>Contact Us</button>
                </div>

                <div className="navbar__s3">
                    <Link to="/login">
                        <button>
                            <p>Login</p>
                            <img src={arrow} alt="arrow" />
                        </button>
                    </Link>
                </div>
            </div>

            <div className="responsive__navbar">
                <div className="responsive__navbar__s1">
                    <img src="/logo.png" alt="logo" />
                </div>
                <div className="responsive__navbar__s2">
                    <h2> <span className="responsive__navbar__s2__part1">Food</span><span className="responsive__navbar__s2__part2">Loop</span></h2>
                    <p>Zero Waste. Infinite Impact</p>
                </div>
                <div className="responsive__navbar__s3">
                    <img src={menu} alt="menu-bar" onClick={toggleMenu} />
                </div>
            </div>

            {isMenuOpen && (
                <div className="responsive__navbar__overlay" onClick={toggleMenu}>
                    <div
                        className="responsive__navbar__popup"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Link to="/" onClick={toggleMenu}>Home</Link>
                        <button
                            type="button"
                            className="responsive__navbar__popup__link"
                            onClick={() => scrollToSection('about')}
                        >
                            About Us
                        </button>
                        <button
                            type="button"
                            className="responsive__navbar__popup__link"
                            onClick={() => scrollToSection('contact')}
                        >
                            Contact Us
                        </button>
                        <button
                            className="responsive__navbar__popup__login"
                            onClick={() => navigate('login')}
                        >
                            Login
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

export default Navbar