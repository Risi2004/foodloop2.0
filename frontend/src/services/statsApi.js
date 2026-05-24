/**
 * Offline stub for landing page stats.
 */
export const getPublicStats = async () => ({
  success: true,
  stats: {
    donors: 0,
    drivers: 0,
    receivers: 0,
    foodSavedKg: 0,
    peopleFed: 0,
    methaneSavedKg: 0,
  },
});
