export function formatFleetTimestamp(value) {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return 'Time unavailable';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function getLocationFreshness(location) {
  if (location?.isStale === true) return 'Stale location';
  if (location?.isStale === false) return 'Recent location';
  return 'Location status unavailable';
}

export function getTripLocationSummary(trips) {
  if (!Array.isArray(trips) || trips.length === 0) return 'empty';
  return trips.every((item) => item?.location == null) ? 'none' : 'available';
}

export function hasValidCoordinates(location) {
  return Boolean(location)
    && Number.isFinite(location.latitude)
    && location.latitude >= -90
    && location.latitude <= 90
    && Number.isFinite(location.longitude)
    && location.longitude >= -180
    && location.longitude <= 180;
}

export function getTripsWithValidCoordinates(trips) {
  if (!Array.isArray(trips)) return [];
  return trips.filter((item) => hasValidCoordinates(item?.location));
}

export function reconcileSelectedTripId(selectedTripId, trips) {
  if (selectedTripId == null) return null;
  return Array.isArray(trips) && trips.some((item) => String(item?.trip?.id) === String(selectedTripId))
    ? selectedTripId
    : null;
}
