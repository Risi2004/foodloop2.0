import TransparencyLoopCard from '../transparencyLoopCard/TransparencyLoopCard';
import icon1 from "../../../assets/icons/transparency-loop/1.svg"
import icon2 from "../../../assets/icons/transparency-loop/2.svg"
import icon3 from "../../../assets/icons/transparency-loop/3.svg"
import icon4 from "../../../assets/icons/transparency-loop/4.svg"
import icon5 from "../../../assets/icons/transparency-loop/5.svg"
import './TransparencyLoopCardSection.css'

function TransparencyLoopCardSection() {

    const TransparencyLoopData = [
        {
            id: 1,
            icon: icon1,
            title: "Doner Add Foods",
            card: "RED Status",
            description: "Donor lists surplus food details and location."
        },
        {
            id: 2,
            icon: icon2,
            title: "Verified & Checked",
            card: "PROCESSING",
            description: "System or volunteer verifies food quality and safety."
        },
        {
            id: 3,
            icon: icon3,
            title: "Reached NGO",
            card: "GREEN Status",
            description: "Food is collected by volunteer or reached NGO hub."
        },
        {
            id: 4,
            icon: icon4,
            title: "Delivered to Needy",
            card: "BLUE Status",
            description: "Final distribution to beneficiaries is completed."
        },
        {
            id: 5,
            icon: icon5,
            title: "Digital Receipt",
            card: "IMPACT REPORT",
            description: "Donor receives a transparent report of the impact."
        },

    ];

    return (
        <div className="transparency__loop__card__section">
            <div className='transparency__loop__card__section__s1'>
                <h1>How the Transparency Loop Works</h1>
                <p>Follow the journey of every donation in real-time. We believe transparency builds trust, and trust feeds more people.</p>
            </div>
            <div className='transparency__loop__card__section__s2'>
                {TransparencyLoopData.map((loop) => (
                    <TransparencyLoopCard
                        key={loop.id}
                        icon={loop.icon}
                        title={loop.title}
                        card={loop.card}
                        description={loop.description}
                    />
                ))}
            </div>
        </div>
    )
}

export default TransparencyLoopCardSection;