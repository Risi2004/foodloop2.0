import './FunctionsCard.css'

function FunctionsCard({ icon, title, description }) {
    return (
        <div className="functions__card">
            <img src={icon} alt={title} />
            <h2>{title}</h2>
            <p>{description}</p>
        </div>
    )
}

export default FunctionsCard;