import './StatsCard.css';

const StatsCard = ({ title, count, icon, type }) => {
    return (
        <div className={`stats-card ${type}`}>
            <div className="icon-container">
                {icon}
            </div>
            <div className="stats-content">
                <h3 className="stats-title">{title}</h3>
                <p className="stats-count">{count}</p>
            </div>
        </div>
    );
};

export default StatsCard;
