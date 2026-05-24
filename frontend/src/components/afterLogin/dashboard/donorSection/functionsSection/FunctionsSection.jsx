import icon1 from "../../../../../assets/icons/afterLogin/functions/camera-green.svg"
import icon2 from "../../../../../assets/icons/afterLogin/functions/Scorecard.svg"
import icon3 from "../../../../../assets/icons/afterLogin/functions/Lightning-Bolt.svg"
import FunctionCard from "../../common/functionsCard/FunctionsCard"
import './FunctionsSection.css'

function FunctionsSection() {
    const FunctionData = [
        {
            id: 1,
            icon: icon1,
            title: "Computer Vision",
            description: "Instantly identifies food types and estimates volume with 98% accuracy."
        },
        {
            id: 2,
            icon: icon2,
            title: "Freshness Scoring",
            description: "AI evaluates visual cues to ensure only high-quality food enters the loop."
        },
        {
            id: 3,
            icon: icon3,
            title: "Auto-Categorization",
            description: "Automatically tags allergens and storage requirements for recipient NGOs."
        },
    ];

    return (
        <div className='function__section'>
            <h4>The Technology</h4>
            <h1>Snap & List AI</h1>
            <p>Forget manual entry. Our computer vision technology analyzes your surplus in seconds.</p>
            <div className="function__section__s1">
                {FunctionData.map((stat) => (
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