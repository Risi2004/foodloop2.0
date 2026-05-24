import sign from "../../../assets/icons/privacy-policy/At-Sign.svg";
import cloudFolder from "../../../assets/icons/privacy-policy/Cloud-Folder.svg";
import contact from "../../../assets/icons/privacy-policy/Contact.svg";
import law from "../../../assets/icons/privacy-policy/Law.svg";
import left from "../../../assets/icons/privacy-policy/Left.svg";
import location from "../../../assets/icons/privacy-policy/Location.svg";
import mindMap from "../../../assets/icons/privacy-policy/Mind-Map.svg";
import securityLock from "../../../assets/icons/privacy-policy/Security-Lock.svg";
import share from "../../../assets/icons/privacy-policy/Share.svg";
import './PrivacyPolicy.css';

function PrivacyPolicy() {

    const handleBackClick = () => {
        window.history.back();
    };

    return (
        <div className="privacyPolicy">
            <div className="privacy-back common-back-bar common-back-bar--padded-small common-back-bar--clickable" onClick={handleBackClick}>
                <img className="privacy-back__icon common-back-icon" src={left} />
                <div className="privacy-back__text common-back-text">Back to</div>
            </div>
            <div className="privacy-container common-content-wrapper">
                <div className="privacy-sidebar common-glass-card common-glass-card--transparent">
                    <div className="privacy-sidebar__header">
                        <div className="privacy-sidebar__title">Contents</div>
                        <div className="privacy-sidebar__subtitle">Navigate the policy sections</div>
                    </div>
                    <div className="privacy-sidebar__menu">
                        <a href="#compliance" className="privacy-sidebar__item">
                            <img className="privacy-sidebar__item-icon common-icon" src={law} />
                            <div className="privacy-sidebar__item-label">Compliance</div>
                        </a>
                        <a href="#data-collection" className="privacy-sidebar__item">
                            <img className="privacy-sidebar__item-icon common-icon" src={cloudFolder} />
                            <div className="privacy-sidebar__item-label">Data Collection</div>
                        </a>
                        <a href="#ai-data-usage" className="privacy-sidebar__item">
                            <img className="privacy-sidebar__item-icon common-icon" src={mindMap} />
                            <div className="privacy-sidebar__item-label">AI &amp; Data Usage</div>
                        </a>
                        <a href="#data-sharing" className="privacy-sidebar__item">
                            <img className="privacy-sidebar__item-icon common-icon" src={share} />
                            <div className="privacy-sidebar__item-label">Data Sharing</div>
                        </a>
                        <a href="#security" className="privacy-sidebar__item">
                            <img className="privacy-sidebar__item-icon common-icon" src={securityLock} />
                            <div className="privacy-sidebar__item-label">Security</div>
                        </a>
                        <a href="#contact-us" className="privacy-sidebar__item">
                            <img className="privacy-sidebar__item-icon common-icon" src={contact} />
                            <div className="privacy-sidebar__item-label">Contact Us</div>
                        </a>
                    </div>
                </div>
                <div className="privacy-content-area common-glass-card common-glass-card--transparent">
                    <div className="privacy-content-area__header">
                        <div className="privacy-content-area__title">Our Commitment to Privacy</div>
                        <div className="privacy-content-area__intro">
                            FoodLoop is dedicated to reducing food waste in Sri Lanka while
                            protecting the data of our donors, NGOs, and partners. We believe that
                            transparency is the foundation of a sustainable food redistribution
                            ecosystem. This policy outlines our practices in accordance with the
                            Personal Data Protection Act (PDPA) No. 9 of 2022.
                        </div>
                    </div>
                    <div id="compliance" className="privacy-section common-section">
                        <div className="privacy-section__title common-section-title">Compliance with Sri Lankan Law</div>
                        <div className="privacy-section__text common-section-text">
                            Our operations are strictly governed by the Personal Data Protection
                            Act (PDPA) of Sri Lanka. We act as both a data controller and a data
                            processor depending on the nature of the transaction between donors
                            and recipient NGOs.
                        </div>
                        <div className="privacy-section__highlight common-highlight-list common-highlight-list--row">
                            <div className="privacy-section__highlight-text">
                                Our operations are strictly governed by the Personal Data Protection
                                Act (PDPA) of Sri Lanka. We act as both a data controller and a data
                                processor depending on the nature of the transaction between donors
                                and recipient NGOs.
                            </div>
                        </div>
                    </div>
                    <div id="data-collection" className="privacy-section common-section">
                        <div className="privacy-section__title common-section-title">Information We Collect</div>
                        <div className="privacy-section__text common-section-text">
                            To effectively bridge the gap between food surplus and those in need,
                            we collect the following types of information:
                        </div>
                        <div className="privacy-section__list common-highlight-list">
                            <div className="privacy-section__list-item common-flex-row">
                                <div className="privacy-section__list-item-title common-card-title">Identity Data:</div>
                                <div className="privacy-section__list-item-text common-card-text common-card-text--dark">
                                    Names of individual donors or registered NGO representatives.
                                </div>
                            </div>
                            <div className="privacy-section__list-item common-flex-row">
                                <div className="privacy-section__list-item-title common-card-title">Contact Data:</div>
                                <div className="privacy-section__list-item-text common-card-text common-card-text--dark">
                                    Phone numbers and email addresses for logistical coordination.
                                </div>
                            </div>
                            <div className="privacy-section__list-item common-flex-row">
                                <div className="privacy-section__list-item-title common-card-title">Logistics Data:</div>
                                <div className="privacy-section__list-item-text common-card-text common-card-text--dark">
                                    Pick-up and delivery addresses in Sri Lanka (using geo-location
                                    services).
                                </div>
                            </div>
                            <div className="privacy-section__list-item common-flex-row">
                                <div className="privacy-section__list-item-title common-card-title">Food Data:</div>
                                <div className="privacy-section__list-item-text common-card-text common-card-text--dark">
                                    Types of surplus food, expiry dates, and quantity metrics for AI
                                    processing.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="ai-data-usage" className="privacy-section common-section">
                        <div className="privacy-section__title common-section-title">AI and Data Usage</div>
                        <div className="privacy-section__text common-section-text">
                            FoodLoop uses Artificial Intelligence to optimize redistribution
                            routes and predict food waste patterns.
                        </div>
                        <div className="privacy-section__text privacy-section__text--secondary common-section-text common-section-text--secondary">
                            Specifically, we use anonymized data to train our algorithms to
                            understand regional demand in Colombo, Kandy, and other major hubs. No
                            personally identifiable information is used for algorithm training
                            without explicit consent.
                        </div>
                    </div>
                    <div id="data-sharing" className="privacy-section privacy-section--compact common-section common-section--compact">
                        <div className="privacy-section__title common-section-title">Data Sharing</div>
                        <div className="privacy-section__text common-section-text">
                            We share necessary information only with parties directly involved in
                            the food loop:
                        </div>
                        <div className="privacy-section__sharing common-flex-row">
                            <div className="privacy-section__sharing-item common-card-item">
                                <div className="privacy-section__sharing-item-title common-card-title">With Donors</div>
                                <div className="privacy-section__sharing-item-text common-card-text common-card-text--dark common-card-text--small">
                                    Feedback on the impact of their donation (anonymized recipient
                                    metrics).
                                </div>
                            </div>
                            <div className="privacy-section__sharing-item common-card-item">
                                <div className="privacy-section__sharing-item-title common-card-title">With NGOs</div>
                                <div className="privacy-section__sharing-item-text common-card-text common-card-text--dark common-card-text--small">
                                    Collection addresses and contact info of the donor for pick-up
                                    verification.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="security" className="privacy-section privacy-section--compact common-section common-section--compact">
                        <div className="privacy-section__title common-section-title">Security Measures</div>
                        <div className="privacy-section__text common-section-text">
                            We implement industry-standard AES-256 encryption for data at rest and
                            TLS for data in transit. Our servers are monitored 24/7 for
                            unauthorized access attempts.
                        </div>
                    </div>
                    <div id="contact-us" className="privacy-section privacy-section--compact common-section common-section--compact">
                        <div className="privacy-section__title common-section-title">Contact Us</div>
                        <div className="privacy-section__text common-section-text">
                            If you have any questions about this Privacy Policy or our data
                            protection practices, please contact our Data Protection Officer at:
                        </div>
                        <div className="privacy-section__contact">
                            <div className="privacy-section__contact-item common-contact-row common-contact-row--start">
                                <img className="privacy-section__contact-icon common-icon" src={sign} />
                                <div className="privacy-section__contact-text">foodloop.official@gmail.com</div>
                            </div>
                            <div className="privacy-section__contact-item common-contact-row common-contact-row--start">
                                <img className="privacy-section__contact-icon common-icon" src={location} />
                                <div className="privacy-section__contact-text privacy-section__contact-text--secondary">Colombo, Sri Lanka</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}

export default PrivacyPolicy;