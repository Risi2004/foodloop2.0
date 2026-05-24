import icon1 from "../../../../../assets/icons/afterLogin/status-batch/silver.svg"
import icon2 from "../../../../../assets/icons/afterLogin/status-batch/gold.svg"
import icon3 from "../../../../../assets/icons/afterLogin/status-batch/centurion.svg"
import icon4 from "../../../../../assets/icons/afterLogin/status-batch/tick.svg"
import './StatusBatchCard.css'

function StatusBatchCard() {
    return (
        <div className='status__card__section'>
            <h1>Earn Your Status</h1>
            <p>Join our tiered donor program and showcase your commitment to the circular economy.</p>
            <div className="status__cards">
                <div className='status__card'>
                    <img src={icon1} alt="Silver-Badge" />
                    <h1>Silver Donor</h1>
                    <p>25+ Verified Donations</p>
                    <div className="status__card__content">
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>Digital Badge for Website</p>
                        </div>
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>Basic Impact Reporting</p>
                        </div>
                    </div>
                </div>

                <div className='status__card'>
                    <img src={icon2} alt="Gold-Badge" />
                    <h1>Gold Donor</h1>
                    <p>50+ Verified Donations</p>
                    <div className="status__card__content">
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>Priority Collection Status</p>
                        </div>
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>"Featured" in NGO Portal</p>
                        </div>
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>Quarterly CSR Consult</p>
                        </div>
                    </div>
                </div>

                <div className='status__card'>
                    <img src={icon3} alt="Silver-Badge" />
                    <h1>Centurion Donor</h1>
                    <p>100+ Verified Donations</p>
                    <div className="status__card__content">
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>Custom Impact Dashboard</p>
                        </div>
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>Press Kit & Media Support</p>
                        </div>
                        <div className="status__card__points">
                            <img src={icon4} alt="tick" />
                            <p>Annual Impact Award</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default StatusBatchCard;