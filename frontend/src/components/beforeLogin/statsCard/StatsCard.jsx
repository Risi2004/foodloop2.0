import "./StatsCard.css"

function StatsCard({ icon, count, title }) {
    return (
        <div className="stats__card">
            <img src={icon} alt={title} />
            <h2>{count}</h2>
            <h2>{title}</h2>
        </div>
    )
}


export default StatsCard;