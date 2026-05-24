/**
 * Location Service for continuous driver location tracking
 * Uses browser Geolocation API to track driver's position
 */

let watchId = null;
let updateCallback = null;
let isTracking = false;

/**
 * Start tracking driver location
 * @param {Function} callback - Callback function called with {latitude, longitude}
 * @param {Object} options - Options for geolocation
 * @returns {number|null} Watch ID or null if failed
 */
export const startLocationTracking = (callback, options = {}) => {
  if (!navigator.geolocation) {
    console.error('[LocationService] Geolocation is not supported by this browser');
    if (callback) callback(null, new Error('Geolocation is not supported'));
    return null;
  }

  if (isTracking) {
    console.warn('[LocationService] Location tracking is already active');
    return watchId;
  }

  updateCallback = callback;

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
    ...options,
  };

  const onSuccess = (position) => {
    const { latitude, longitude } = position.coords;
    
    // Validate coordinates are within Sri Lanka bounds
    if (latitude >= 5 && latitude <= 10 && longitude >= 79 && longitude <= 82) {
      console.log('[LocationService] Location updated:', { latitude, longitude });
      if (updateCallback) {
        updateCallback({ latitude, longitude }, null);
      }
    } else {
      console.warn('[LocationService] Coordinates outside Sri Lanka bounds:', { latitude, longitude });
      if (updateCallback) {
        updateCallback(null, new Error('Location is outside Sri Lanka'));
      }
    }
  };

  const onError = (error) => {
    console.error('[LocationService] Geolocation error:', error);
    if (updateCallback) {
      updateCallback(null, error);
    }
  };

  try {
    // Use watchPosition for continuous tracking
    watchId = navigator.geolocation.watchPosition(onSuccess, onError, defaultOptions);
    isTracking = true;
    console.log('[LocationService] Location tracking started, watchId:', watchId);
    return watchId;
  } catch (error) {
    console.error('[LocationService] Error starting location tracking:', error);
    isTracking = false;
    if (updateCallback) {
      updateCallback(null, error);
    }
    return null;
  }
};

/**
 * Stop tracking driver location
 */
export const stopLocationTracking = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    isTracking = false;
    updateCallback = null;
    console.log('[LocationService] Location tracking stopped');
  }
};

/**
 * Get current location once (not continuous)
 * @param {Function} callback - Callback function
 * @param {Object} options - Options for geolocation
 */
export const getCurrentLocation = (callback, options = {}) => {
  if (!navigator.geolocation) {
    console.error('[LocationService] Geolocation is not supported by this browser');
    if (callback) callback(null, new Error('Geolocation is not supported'));
    return;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...options,
  };

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      // Validate coordinates
      if (latitude >= 5 && latitude <= 10 && longitude >= 79 && longitude <= 82) {
        if (callback) {
          callback({ latitude, longitude }, null);
        }
      } else {
        if (callback) {
          callback(null, new Error('Location is outside Sri Lanka'));
        }
      }
    },
    (error) => {
      console.error('[LocationService] Error getting current location:', error);
      if (callback) {
        callback(null, error);
      }
    },
    defaultOptions
  );
};

/**
 * Check if location tracking is active
 * @returns {boolean}
 */
export const isLocationTrackingActive = () => {
  return isTracking;
};
