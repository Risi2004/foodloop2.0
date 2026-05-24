import './TransparencyLoopCard.css'

function TransparencyLoopCard({ icon, title, card, description }) {
    return (
        <div className="transparency__loop__card">
            <img src={icon} alt="title" />
            <h1>{title}</h1>
            <h4>{card}</h4>
            <p>{description}</p>
        </div>
    )
}

export default TransparencyLoopCard;
