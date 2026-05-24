import icon1 from "../../../../../assets/icons/afterLogin/status-batch/silver.svg"
import icon2 from "../../../../../assets/icons/afterLogin/status-batch/gold.svg"
import icon3 from "../../../../../assets/icons/afterLogin/status-batch/centurion.svg"
import icon4 from "../../../../../assets/icons/afterLogin/status-batch/tick.svg"
import './DriverStatusBatch.css'

function DonorStatusBatch() {
    return (
        <>
            <div className="donor__status__heading">
                <h1>Earn Your Status</h1>
                <p>Join our tiered donor program and showcase your commitment to the circular economy.</p>
            </div>
            <div className='donor__status__batch'>
                <div className='donor__status__batch__card'>
                    <img src={icon1} alt="silver" />
                    <h1>Silver Driver</h1>
                    <p>25+ Verified Donations</p>
                    <div className="donor__status__batch__card__points__section">
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>Digital Badge for Website</h4>
                        </div>
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>Basic Impact Reporting</h4>
                        </div>
                    </div>
                </div>
                <div className='donor__status__batch__card'>
                    <img src={icon2} alt="silver" />
                    <h1>Gold Driver</h1>
                    <p>50+ Verified Donations</p>
                    <div className="donor__status__batch__card__points__section">
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>Priority Collection Status</h4>
                        </div>
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>"Featured" in NGO Portal</h4>
                        </div>
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>Quarterly CSR Consult</h4>
                        </div>
                    </div>
                </div>
                <div className='donor__status__batch__card'>
                    <img src={icon3} alt="silver" />
                    <h1>Centurion Driver</h1>
                    <p>100+ Verified Donations</p>
                    <div className="donor__status__batch__card__points__section">
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>Custom Impact Dashboard</h4>
                        </div>
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>Press Kit & Media Support</h4>
                        </div>
                        <div className="donor__status__batch__card__points">
                            <img src={icon4} alt="point" />
                            <h4>Annual Impact Award</h4>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default DonorStatusBatch;