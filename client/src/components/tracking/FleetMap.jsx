import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { getTripsWithValidCoordinates } from '../../utils/fleetMonitoring.js';
import { VanMarker } from './VanMarker.jsx';
import 'leaflet/dist/leaflet.css';

function MapViewport({ trips, selectedTripId, markerSetKey }) {
  const map = useMap();
  const selectedTrip = trips.find((item) => String(item?.trip?.id) === String(selectedTripId));

  useEffect(() => {
    if (markerSetKey && trips.length > 0) {
      const bounds = trips.map((item) => [item.location.latitude, item.location.longitude]);
      if (bounds.length === 1) map.setView(bounds[0], Math.max(map.getZoom(), 13));
      else map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    }
  }, [map, markerSetKey]);

  useEffect(() => {
    if (selectedTrip?.location) {
      map.flyTo(
        [selectedTrip.location.latitude, selectedTrip.location.longitude],
        Math.max(map.getZoom(), 14),
        { duration: 0.35 }
      );
    }
  }, [map, selectedTripId]);

  return null;
}

export function FleetMap({ trips, selectedTripId, onSelectTrip }) {
  const locatedTrips = useMemo(() => getTripsWithValidCoordinates(trips), [trips]);
  const markerSetKey = locatedTrips
    .map((item) => String(item?.trip?.id))
    .sort()
    .join('|');
  const firstLocation = locatedTrips[0]?.location;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30" aria-label="Fleet map">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Active fleet map</h2>
          <p className="mt-0.5 text-xs text-slate-500">OpenStreetMap · {locatedTrips.length} located {locatedTrips.length === 1 ? 'trip' : 'trips'}</p>
        </div>
        <p className="text-xs text-slate-500">Green: recent · Amber: stale</p>
      </div>
      <div className="relative h-[360px] w-full sm:h-[440px] xl:h-[min(68vh,720px)]">
        {firstLocation ? <MapContainer
          center={[firstLocation.latitude, firstLocation.longitude]}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full"
          aria-label="Map showing active school trip locations"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewport trips={locatedTrips} selectedTripId={selectedTripId} markerSetKey={markerSetKey}/>
          {locatedTrips.map((item) => <VanMarker
            key={item.trip.id}
            item={item}
            selected={String(item.trip.id) === String(selectedTripId)}
            onSelect={onSelectTrip}
          />)}
        </MapContainer> : <div className="grid h-full place-items-center bg-slate-100 px-6 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm" aria-hidden="true">⌖</span><h3 className="mt-3 text-sm font-semibold text-slate-900">No valid locations to map</h3><p className="mt-1 max-w-xs text-sm leading-5 text-slate-600">The map will show trips after valid coordinates are reported.</p></div></div>}
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 sm:px-5">Map data © OpenStreetMap contributors</p>
    </section>
  );
}
