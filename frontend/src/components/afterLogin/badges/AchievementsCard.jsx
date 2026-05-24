import { getBadgeIconSrc, BADGE_KEYS_ORDER } from '../../../utils/badgeIcons';
import warrantyIcon from '../../../assets/donor profile/Warranty.svg';
import './AchievementsCard.css';

/**
 * Achievements & Badges card: header, large current badge + name, horizontal badge row, progress bar.
 * Same data/API as before; layout matches the design (donor/driver profile).
 * @param {{ badgeProgress: { currentBadgeKey?: string, currentBadge?: string, timeline?: Array<{ achieved: boolean }>, remaining?: number, nextBadge?: string|null, nextMilestone?: number|null } | null, unitLabel: string }} props
 * unitLabel: "donations" (donor) or "deliveries" (driver)
 */
function AchievementsCard({ badgeProgress, unitLabel = 'donations' }) {
    const timeline = badgeProgress?.timeline || [];
    const remaining = badgeProgress?.remaining ?? 0;
    const nextBadge = badgeProgress?.nextBadge ?? null;
    const nextMilestone = badgeProgress?.nextMilestone ?? null;
    const allAchieved = timeline.length > 0 && timeline.every((t) => t.achieved);

    const progressPercent =
        nextMilestone != null && nextMilestone > 0 && !allAchieved
            ? Math.min(100, ((nextMilestone - remaining) / nextMilestone) * 100)
            : allAchieved ? 100 : 0;

    const progressText = allAchieved
        ? `You've reached all ${unitLabel} badges!`
        : nextBadge && remaining > 0
            ? `${remaining} more ${unitLabel} to next Badge`
            : nextBadge && remaining === 0
                ? `1 more ${unitLabel === 'donations' ? 'donation' : 'delivery'} to next Badge`
                : `Complete your first ${unitLabel === 'donations' ? 'donation' : 'delivery'} to start`;

    const currentName = badgeProgress?.currentBadge
        ? badgeProgress.currentBadge
        : unitLabel === 'donations'
            ? 'FoodLoop Donor'
            : 'FoodLoop Driver';

    return (
        <div className="achievements-card-content">
            <div className="achievements-card-content__header">
                <img src={warrantyIcon} alt="" className="achievements-card-content__icon-img" />
                <h3 className="achievements-card-content__title">Achievements & Badges</h3>
            </div>

            <div className="achievements-card-content__current">
                {badgeProgress?.currentBadgeKey && getBadgeIconSrc(badgeProgress.currentBadgeKey) ? (
                    <img
                        src={getBadgeIconSrc(badgeProgress.currentBadgeKey)}
                        alt={currentName}
                        className="achievements-card-content__current-icon"
                        title={currentName}
                    />
                ) : (
                    <span className="achievements-card-content__current-placeholder">
                        <img src={warrantyIcon} alt="" className="achievements-card-content__current-placeholder-img" />
                    </span>
                )}
                <span className="achievements-card-content__current-name">{currentName}</span>
            </div>

            <div className="achievements-card-content__badges-row">
                {BADGE_KEYS_ORDER.map((key, index) => {
                    const item = timeline[index];
                    const achieved = item?.achieved ?? false;
                    const src = getBadgeIconSrc(key);
                    return (
                        <div
                            key={key}
                            className={`achievements-card-content__badge-circle ${achieved ? 'achievements-card-content__badge-circle--achieved' : 'achievements-card-content__badge-circle--locked'}`}
                            title={item?.name || key}
                        >
                            {src ? (
                                <img src={src} alt="" className="achievements-card-content__badge-circle-icon" />
                            ) : (
                                <span>{achieved ? '✓' : '○'}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="achievements-card-content__progress">
                <p className="achievements-card-content__progress-text">{progressText}</p>
                <div className="achievements-card-content__progress-bar">
                    <div
                        className="achievements-card-content__progress-fill"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default AchievementsCard;
