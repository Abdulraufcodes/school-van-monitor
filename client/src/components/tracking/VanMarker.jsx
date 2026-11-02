import { useMemo } from 'react';
import { divIcon } from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { formatFleetTimestamp, getLocationFreshness } from '../../utils/fleetMonitoring.js';

function createMarkerIcon(location) {
  const freshness = location?.isStale === true ? 'stale' : location?.isStale === false ? 'fresh' : 'unknown';
  return divIcon({
    className: `fleet-map-marker fleet-map-marker--${freshness}`,
    html: '<span aria-hidden="true"></span>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14]
  });
}

function displayStatus(status) {
  if (typeof status !== 'string' || !status) return 'Trip status unavailable';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function VanMarker({ item, selected, onSelect }) {
  const trip = item?.trip;
  const van = item?.van;
  const driver = item?.driver;
  const location = item?.location;
  const icon = useMemo(() => createMarkerIcon(location), [location?.isStale]);

  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={icon}
      title={van?.registrationNumber || 'Van information unavailable'}
      alt={van?.registrationNumber || 'Active trip location marker'}
      eventHandlers={{ click: () => onSelect(trip.id) }}
      zIndexOffset={selected ? 1000 : 0}
    >
      <Popup>
        <div className="min-w-52 space-y-2 text-sm text-slate-800">
          <h3 className="font-semibold text-slate-950">{van?.registrationNumber || 'Registration unavailable'}</h3>
          <p><span className="font-medium">Driver:</span> {driver?.name || 'Driver information unavailable'}</p>
          <p><span className="font-medium">Trip status:</span> {displayStatus(trip?.status)}</p>
          <p><span className="font-medium">Location:</span> {getLocationFreshness(location)}</p>
          <p><span className="font-medium">Coordinates:</span> {location.latitude}, {location.longitude}</p>
          <p><span className="font-medium">Recorded:</span> {formatFleetTimestamp(location.recordedAt)}</p>
          <p><span className="font-medium">Received:</span> {formatFleetTimestamp(location.receivedAt)}</p>
          {selected && <p className="border-t border-slate-200 pt-2 text-xs font-semibold text-cyan-800">Selected trip</p>}
        </div>
      </Popup>
    </Marker>
  );
}
