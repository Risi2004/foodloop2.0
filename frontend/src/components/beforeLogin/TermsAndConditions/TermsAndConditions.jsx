import "./TermsAndConditions.css";
import left from "../../../assets/icons/privacy-policy/Left.svg";

function TermsAndConditions() {
    const handleBackClick = () => {
        window.history.back();
    };

    return (
        <div className="termsPage">
            <div className="termsPage__container">
                <div className="termsPage__backBar">
                    <button className="termsPage__backButton" onClick={handleBackClick}>
                        <img
                            className="termsPage__backIcon"
                            src={left}
                            alt="Back"
                        />
                        <span className="termsPage__backText">Back to</span>
                    </button>
                </div>

                <div className="termsPage__card">
                    <header className="termsPage__header">
                        <h1 className="termsPage__title">Terms & Conditions</h1>
                        <p className="termsPage__updatedAt">Last Updated: January 2026</p>
                        <p className="termsPage__intro">
                            Welcome to FoodLoop. These Terms and Conditions govern your use of
                            our platform, which leverages AI technology to facilitate food
                            surplus redistribution across Sri Lanka. By accessing our
                            services, you agree to comply with these terms to ensure a safe
                            and efficient community for reducing food waste.
                        </p>
                    </header>

                    <section className="termsPage__section">
                        <h2 className="termsPage__sectionTitle">Acceptance of Terms</h2>
                        <p className="termsPage__sectionText">
                            By creating an account or using the FoodLoop platform, you agree
                            to be bound by these Terms and Conditions and our Privacy Policy.
                            Our AI-driven service connects food donors with receivers
                            efficiently to minimize wastage in Sri Lankan communities.
                        </p>
                    </section>

                    <section className="termsPage__section">
                        <h2 className="termsPage__sectionTitle">The FoodLoop Service</h2>
                        <p className="termsPage__sectionText">
                            FoodLoop provides a digital marketplace that matches surplus food
                            from businesses and individuals with registered receivers. Our AI
                            algorithms prioritize delivery based on:
                        </p>
                        <ul className="termsPage__highlightList">
                            <li className="termsPage__highlightItem">
                                Proximity between donors and receivers.
                            </li>
                            <li className="termsPage__highlightItem">
                                Urgency and expiration timing of donated items.
                            </li>
                            <li className="termsPage__highlightItem">
                                Historical donation patterns and reliability.
                            </li>
                        </ul>
                    </section>

                    <section className="termsPage__section">
                        <h2 className="termsPage__sectionTitle">User Obligations</h2>
                        <div className="termsPage__obligationsGrid">
                            <article className="termsPage__obligationCard">
                                <h3 className="termsPage__obligationTitle">For Donors</h3>
                                <p className="termsPage__obligationText">
                                    Donors must ensure that all food provided is fit for human
                                    consumption and complies with Sri Lankan food safety
                                    standards. Accurate descriptions and photos are required for
                                    every listing.
                                </p>
                            </article>
                            <article className="termsPage__obligationCard">
                                <h3 className="termsPage__obligationTitle">With NGOs</h3>
                                <p className="termsPage__obligationText">
                                    Receivers must collect food within the agreed timeframes.
                                    Failure to show up for confirmed pickups may result in
                                    temporary or permanent suspension of account privileges.
                                </p>
                            </article>
                        </div>
                    </section>

                    <section className="termsPage__section">
                        <h2 className="termsPage__sectionTitle">Food Safety & Liability</h2>
                        <p className="termsPage__sectionText">
                            While FoodLoop facilitates the connection, we do not inspect the
                            food physically. Users agree that:
                        </p>
                        <ul className="termsPage__highlightList">
                            <li className="termsPage__highlightItem">
                                FoodLoop is not liable for illness or injury resulting from
                                donated items.
                            </li>
                            <li className="termsPage__highlightItem">
                                The platform acts solely as a mediator for surplus
                                redistribution.
                            </li>
                            <li className="termsPage__highlightItem">
                                Donors remain responsible for the quality and safety of their
                                donations until pickup.
                            </li>
                        </ul>
                    </section>

                    <section className="termsPage__section">
                        <h2 className="termsPage__sectionTitle">Governing Law</h2>
                        <p className="termsPage__sectionText">
                            These terms shall be governed by and construed in accordance with
                            the laws of the Democratic Socialist Republic of Sri Lanka. Any
                            disputes shall be subject to the exclusive jurisdiction of the
                            courts in Colombo.
                        </p>
                    </section>

                    <footer className="termsPage__contactFooter">
                        <h3 className="termsPage__contactHeading">Questions or Feedback?</h3>
                        <p className="termsPage__contactSubtitle">
                            Contact our official legal and support team at:
                        </p>
                        <a href="mailto:foodloop.official@gmail.com" className="termsPage__contactEmail">
                            foodloop.official@gmail.com
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;