import './AwardsTimeline.css';
import { getBadgeIconSrc, BADGE_KEYS_ORDER } from '../../../utils/badgeIcons';

/**
 * Shared Awards and Achievements timeline for Donor and Driver.
 * @param {{ timeline: Array<{ milestone: number, name: string, achieved: boolean }>, remaining: number, nextBadge: string|null, unitLabel: string, hideTitle?: boolean }} props
 * unitLabel: "donations" (donor) or "deliveries" (driver)
 */
function AwardsTimeline({ timeline = [], remaining = 0, nextBadge = null, unitLabel = 'donations', hideTitle = false }) {
    const allAchieved = timeline.length > 0 && timeline.every((t) => t.achieved);

    return (
        <div className="awards-timeline">
            {!hideTitle && <h2 className="awards-timeline__title">Awards and Achievements</h2>}
            <ul className="awards-timeline__list">
                {timeline.map((item, index) => {
                    const badgeKey = BADGE_KEYS_ORDER[index];
                    const iconSrc = badgeKey ? getBadgeIconSrc(badgeKey) : null;
                    return (
                    <li
                        key={item.milestone}
                        className={`awards-timeline__item ${item.achieved ? 'awards-timeline__item--achieved' : 'awards-timeline__item--locked'}`}
                    >
                        <span className="awards-timeline__marker">
                            {iconSrc ? (
                                <img src={iconSrc} alt="" className="awards-timeline__badge-icon" />
                            ) : (
                                item.achieved ? '✓' : '○'
                            )}
                        </span>
                        <div className="awards-timeline__content">
                            <span className="awards-timeline__name">{item.name}</span>
                            <span className="awards-timeline__milestone">
                                — {item.milestone} {unitLabel === 'donations' ? 'donation' : 'delivery'}
                                {item.milestone > 1 ? 's' : ''}
                            </span>
                            {!item.achieved && remaining > 0 && nextBadge === item.name && (
                                <span className="awards-timeline__hint">
                                    ({remaining} more {unitLabel} to unlock)
                                </span>
                            )}
                        </div>
                    </li>
                    );
                })}
            </ul>
            <p className="awards-timeline__next">
                {allAchieved
                    ? `You've reached all ${unitLabel} badges! Congratulations!`
                    : nextBadge && remaining > 0
                        ? `You need ${remaining} more ${unitLabel} to earn ${nextBadge}.`
                        : nextBadge && remaining === 0
                            ? `You're one away! Complete one more ${unitLabel === 'donations' ? 'donation' : 'delivery'} to earn ${nextBadge}.`
                            : `Complete your first ${unitLabel === 'donations' ? 'donation' : 'delivery'} to start earning badges.`}
            </p>
        </div>
    );
}

export default AwardsTimeline;
