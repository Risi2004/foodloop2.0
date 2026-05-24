import { useState, useEffect, useRef } from 'react';
import { getDonationTracking } from '../services/donationApi';
import { getSocket, joinDonation, leaveDonation, onDriverLocation } from '../services/socket';

/**
 * Custom hook for live tracking of driver location.
 * Uses Socket.IO for real-time driver position when donor/receiver is logged in;
 * falls back to polling for full tracking data (status, donor/receiver info).
 *
 * @param {string} donationId - Donation ID to track
 * @param {Object} options - Options for polling
 * @param {number} options.interval - Polling interval in milliseconds (default: 5000)
 * @param {boolean} options.enabled - Whether polling is enabled (default: true)
 * @returns {Object} Tracking data and state
 */
const useLiveTracking = (donationId, options = {}) => {
  const { interval = 5000, enabled = true } = options;

  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  const intervalRef = useRef(null);

  // Fetch tracking data (full snapshot: status, donor, receiver, driver location)
  const fetchTrackingData = async () => {
    if (!donationId || !enabled) {
      return;
    }

    try {
      const response = await getDonationTracking(donationId);

      if (response.success && response.tracking) {
        const data = response.tracking;
        setTrackingData(data);
        setDriverLocation(data.driver?.location || null);
        setError(null);
        if (data.donation?.status === 'delivered') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } else {
        setError('Invalid tracking response');
      }
    } catch (err) {
      console.error('[useLiveTracking] Error fetching tracking data:', err);
      setError(err.message || 'Failed to fetch tracking data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (donationId && enabled) {
      setLoading(true);
      fetchTrackingData();
    } else {
      setLoading(false);
    }
  }, [donationId, enabled]);

  // Socket.IO: join donation room and listen for real-time driver_location
  useEffect(() => {
    if (!donationId || !enabled) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    const handleConnect = () => {
      joinDonation(donationId).then((res) => {
        if (!res?.success) {
          console.warn('[useLiveTracking] Socket join_donation failed:', res?.message);
        }
      });
    };

    if (socket.connected) {
      joinDonation(donationId).then((res) => {
        if (!res?.success) {
          console.warn('[useLiveTracking] Socket join_donation failed:', res?.message);
        }
      });
    } else {
      socket.once('connect', handleConnect);
    }

    const unsubscribe = onDriverLocation((payload) => {
      if (payload?.driverLocation) {
        setDriverLocation(payload.driverLocation);
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      unsubscribe();
      leaveDonation(donationId);
    };
  }, [donationId, enabled]);

  // Polling for full tracking data (status, etc.)
  useEffect(() => {
    if (!donationId || !enabled) {
      return;
    }

    if (trackingData && trackingData.donation?.status === 'delivered') {
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchTrackingData();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [donationId, enabled, interval, trackingData?.donation?.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    trackingData,
    driverLocation,
    loading,
    error,
    refetch: fetchTrackingData,
  };
};

export default useLiveTracking;
