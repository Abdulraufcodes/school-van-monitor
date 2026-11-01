const MAX_LOCATION_AGE_MS = 2 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 30 * 1000;

export function canTrackTrip(trip, isAuthenticated) {
  return Boolean(isAuthenticated && trip?.id && trip?.vanId && trip?.status === 'active');
}

export function getGeolocationError(error) {
  if (error?.code === 1) return 'Location permission was denied. Enable location access and retry.';
  if (error?.code === 2) return 'GPS is unavailable. Check device location settings and retry.';
  if (error?.code === 3) return 'GPS took too long to respond. Retry when ready.';
  return 'GPS is unavailable. Check device location settings and retry.';
}

export function createDriverLocationTracker({ trip, isAuthenticated, geolocation, updateLocation, onStateChange, now = Date.now }) {
  let watchId = null;
  let running = false;
  let inFlight = false;
  let latestAttempted = null;
  let newestTimestamp = -Infinity;
  let lastSuccessAt = null;

  function publish(state, message = '') {
    onStateChange({ state, message, lastSuccessAt });
  }

  function stopWatcher() {
    if (watchId !== null) geolocation?.clearWatch(watchId);
    watchId = null;
    running = false;
  }

  async function onPosition(position) {
    if (!running) return;
    const latitude = position?.coords?.latitude;
    const longitude = position?.coords?.longitude;
    const timestamp = position?.timestamp;
    const currentTime = now();
    const coordinateKey = `${latitude},${longitude}`;

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
      || !Number.isFinite(timestamp) || timestamp <= newestTimestamp
      || timestamp < currentTime - MAX_LOCATION_AGE_MS
      || timestamp > currentTime + MAX_FUTURE_SKEW_MS) {
      stopWatcher();
      publish('gps-unavailable', 'A valid, current GPS reading is unavailable. Retry to reacquire your location.');
      return;
    }

    if (latestAttempted?.coordinateKey === coordinateKey || inFlight) return;
    latestAttempted = { coordinateKey, timestamp };
    newestTimestamp = timestamp;
    inFlight = true;
    publish('acquiring');

    try {
      const result = await updateLocation(trip.vanId, {
        latitude,
        longitude,
        recordedAt: new Date(timestamp).toISOString()
      });
      lastSuccessAt = result.receivedAt;
      publish('tracking');
    } catch (error) {
      stopWatcher();
      if (error?.response) {
        publish('location-rejected', 'The server did not accept this location. Retry GPS before continuing.');
      } else {
        publish('network-unavailable', 'Location was not delivered. Check your connection and retry.');
      }
    } finally {
      inFlight = false;
    }
  }

  function onError(error) {
    if (!running) return;
    stopWatcher();
    publish(error?.code === 1 ? 'permission-denied' : 'gps-unavailable', getGeolocationError(error));
  }

  function start() {
    if (!canTrackTrip(trip, isAuthenticated)) {
      publish('stopped');
      return;
    }
    if (running) return;
    if (!geolocation?.watchPosition) {
      publish('unsupported', 'This browser does not support GPS location.');
      return;
    }
    running = true;
    publish('waiting-permission');
    try {
      watchId = geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000
      });
    } catch {
      stopWatcher();
      publish('gps-unavailable', 'GPS could not start. Check device location settings and retry.');
    }
  }

  function stop(publishStopped = true) {
    stopWatcher();
    if (publishStopped) publish('stopped');
  }

  return { start, stop };
}
