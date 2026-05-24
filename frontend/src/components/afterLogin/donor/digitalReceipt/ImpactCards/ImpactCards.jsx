import distanceIcon from '../../../../../assets/impact-receipt/Swap.svg';
import peopleIcon from '../../../../../assets/impact-receipt/People.svg';
import methaneIcon from '../../../../../assets/impact-receipt/Gas Industry.svg';
import './ImpactCards.css';

const ImpactCards = ({ receipt }) => {
    const distanceKm = receipt?.distanceTraveled != null ? Number(receipt.distanceTraveled) : null;
    const peopleFed = receipt?.peopleFed != null ? Number(receipt.peopleFed) : null;
    const methaneKg = receipt?.methaneSaved != null ? Number(receipt.methaneSaved) : null;

    const cards = [
        {
            icon: distanceIcon,
            title: 'Distance (km)',
            value: distanceKm != null ? String(distanceKm) : '—',
            unit: 'KM',
            gradient: false
        },
        {
            icon: peopleIcon,
            title: 'People Fed',
            value: peopleFed != null ? String(peopleFed) : '—',
            unit: '',
            gradient: true
        },
        {
            icon: methaneIcon,
            title: 'Methane Saved',
            value: methaneKg != null ? String(methaneKg) : '—',
            unit: 'KG',
            gradient: true
        }
    ];

    if (!receipt) {
        return (
            <div className="impact-cards-container">
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Impact receipt pending. The receiver will submit impact details after delivery.</p>
            </div>
        );
    }

    return (
        <div className="impact-cards-container">
            {cards.map((card, index) => (
                <div key={index} className="impact-card">
                    <div className="card-header">
                        <div className="card-icon-box">
                            <img src={card.icon} alt="" className="impact-card-icon" />
                        </div>
                        {card.badge && <span className="card-badge">{card.badge}</span>}
                    </div>

                    <div className="card-content">
                        <div className="card-title">{card.title}</div>
                        <div className="card-value">
                            {card.value}<span className="card-unit">{card.unit}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ImpactCards;
