import { useState, useEffect } from 'react';
import './HeaderImage.css';
import img1 from '../../../assets/header-images/landing-page-header-images/1.svg';
import img2 from '../../../assets/header-images/landing-page-header-images/2.svg';
import img3 from '../../../assets/header-images/landing-page-header-images/3.svg';
import img4 from '../../../assets/header-images/landing-page-header-images/4.svg';
import img5 from '../../../assets/header-images/landing-page-header-images/5.svg';

function HeaderImage() {
    const data = [
        { img: img1, text: "AI-powered photo uploads for instant food categorization and listing." },
        { img: img2, text: "Real-time interactive map connecting surplus food with local community needs." },
        { img: img3, text: "Streamlined logistics ensuring rapid pickup and delivery of donated meals." },
        { img: img4, text: "Verified end-to-end impact trail ensuring food reaches those in hunger." },
        { img: img5, text: "Digital Impact Receipts and badges rewarding for consistent corporate social responsibility" }
    ];

    const [index, setIndex] = useState(0);
    const [showCaption, setShowCaption] = useState(false);

    useEffect(() => {
        const inTimeout = setTimeout(() => {
            setShowCaption(true);
        }, 1000);

        const outTimeout = setTimeout(() => {
            setShowCaption(false);
        }, 7000);

        const slideTimeout = setTimeout(() => {
            setIndex((prev) => (prev + 1) % data.length);
        }, 8000);

        return () => {
            clearTimeout(inTimeout);
            clearTimeout(outTimeout);
            clearTimeout(slideTimeout);
        };
    }, [index, data.length]);

    return (
        <div className="header__image">
            {data.map((item, i) => (
                <div key={i} className={`slide ${index === i ? "active" : ""}`}>
                    <img src={item.img} alt="header" />
                    <div className={`caption__box ${showCaption && index === i ? "show" : ""}`}>
                        <p>{item.text}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default HeaderImage;