import icon1 from "../../../../../assets/icons/afterLogin/functions/camera-green.svg"
import icon2 from "../../../../../assets/icons/afterLogin/functions/Scorecard.svg"
import icon3 from "../../../../../assets/icons/afterLogin/functions/Lightning-Bolt.svg"
import FunctionCard from "../../common/functionsCard/FunctionsCard"
import './FunctionsSection.css'

function FunctionsSection() {

    const DriverFunctionData = [
        {
            id: 1,
            icon: icon1,
            title: "Freshness Guardian Verification",
            description: "Every pickup is pre-screened by our computer vision model, which scans for color and texture changes to ensure you only deliver high-quality nutrition."
        },
        {
            id: 2,
            icon: icon2,
            title: "Impact Traceability Logging",
            description: "Close the loop by logging successful handovers to NGOs, contributing to the digital history required for Impact Receipts."
        },
        {
            id: 3,
            icon: icon3,
            title: "Proximity-Based Routing",
            description: "Receive instant push notifications the moment a new food drop occurs within your radius, ensuring a zero-lag pickup process."
        },
    ];


    return (

        <div className="function__section">
            <h1>Navigate & Claim</h1>
            <p>Advanced tools for the modern surplus hero</p>
            <div className="function__section__s1">
                {DriverFunctionData.map((stat) => (
                    <FunctionCard
                        key={stat.id}
                        icon={stat.icon}
                        title={stat.title}
                        description={stat.description}
                    />
                ))}
            </div>
        </div>
    )
}

export default FunctionsSection;