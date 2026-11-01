export const tripTypeOptions = Object.freeze([
  { value: 'morning_pickup', label: 'Morning Pickup', description: 'Collect students for the school run.' },
  { value: 'afternoon_dropoff', label: 'Afternoon Drop-off', description: 'Return students after school.' }
]);

export function isVanSelectable(van) {
  return van?.isActive === true;
}

export function getTripPanelState({ loading, error, trip }) {
  if (loading) return 'loading';
  if (error) return 'error';
  return trip ? 'active' : 'ready';
}

export function canStartTrip({ panelState, vansLoading, vansError, selectedVan, tripType, action }) {
  return panelState === 'ready'
    && !vansLoading
    && !vansError
    && isVanSelectable(selectedVan)
    && Boolean(tripType)
    && !action;
}

export function tryAcquireActionLock(lockRef) {
  if (lockRef.current) return false;
  lockRef.current = true;
  return true;
}

export function formatTripStartTime(value) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}
