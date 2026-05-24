/**
 * Badge icon assets and helper for navbar, timeline, and donation form.
 * Keys match backend badgeProgress.currentBadgeKey: first_spark, silver, gold, centurion.
 */

import firstSparkIcon from '../assets/badges/first-spark.svg';
import silverIcon from '../assets/badges/silver.svg';
import goldIcon from '../assets/badges/gold.svg';
import centurionIcon from '../assets/badges/centurion.svg';

const BADGE_ICONS = {
  first_spark: firstSparkIcon,
  silver: silverIcon,
  gold: goldIcon,
  centurion: centurionIcon,
};

/** Timeline order (1, 25, 50, 100) for AwardsTimeline */
export const BADGE_KEYS_ORDER = ['first_spark', 'silver', 'gold', 'centurion'];

/**
 * Get badge icon URL for a given key.
 * @param {string} key - currentBadgeKey from API: first_spark | silver | gold | centurion
 * @returns {string|null} - URL for the SVG asset, or null if unknown
 */
export function getBadgeIconSrc(key) {
  if (!key || typeof key !== 'string') return null;
  return BADGE_ICONS[key.trim()] ?? null;
}
