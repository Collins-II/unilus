"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Crosshair } from 'lucide-react';
import { haversine, pathProgress, type RouteStep } from '@/lib/routing';
import 'leaflet/dist/leaflet.css';
import { campuses, campusFor, type CampusId } from '@/lib/campus-geography';

export type CampusMapDestination = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag?: string;
};

export type CampusMapRoom = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  available?: boolean;
  tag?: string;
};

export type CampusRouteInfo = {
  distance: number; // meters along the path
  duration: number; // seconds
  coordinates: [number, number][]; // [lat, lng]
  steps: RouteStep[];
  source: 'road' | 'straight';
};

export type RouteProfile = 'foot' | 'bike';

export type UserLocationMarkerType = {
  lat: number;
  lng: number;
  accuracy: number;
};

// Routes come from our own /api/route proxy (configurable provider). Falls back to a straight line.
async function fetchRoute(
  from: [number, number],
  to: [number, number],
  profile: RouteProfile,
  name: string,
  signal: AbortSignal
): Promise<CampusRouteInfo> {
  const straightDistance = haversine(from, to);
  const speed = profile === 'bike' ? 4.2 : 1.4; // m/s
  const straight: CampusRouteInfo = {
    distance: straightDistance,
    duration: straightDistance / speed,
    coordinates: [from, to],
    steps: [],
    source: 'straight',
  };

  try {
    const params = new URLSearchParams({
      from: `${from[0]},${from[1]}`,
      to: `${to[0]},${to[1]}`,
      profile,
      name,
    });
    const res = await fetch(`/api/route?${params}`, { signal });
    if (!res.ok) return straight;
    const route = await res.json();
    return {
      distance: route.distance,
      // Estimated from path length at a typical pace for the profile.
      duration: route.distance / speed,
      coordinates: route.coordinates,
      steps: route.steps ?? [],
      source: 'road',
    };
  } catch {
    return straight;
  }
}

const REROUTE_DISTANCE_M = 40;
const REROUTE_MIN_INTERVAL_MS = 10000;
const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
function MapFocus({
  destination,
  hasStart,
  route,
  markers,
  campusId,
}: {
  destination: CampusMapDestination | undefined;
  hasStart: boolean;
  route: CampusRouteInfo | null;
  markers: CampusMapRoom[];
  campusId: CampusId;
}) {
  const map = useMap();
  const campus = campuses.find((campus) => campus.id === campusId)!;

  useEffect(() => {
    map.setMinZoom(0);
    map.setMaxBounds(campus.bounds);
    map.fitBounds(campus.bounds);
    map.setMinZoom(map.getBoundsZoom(campus.bounds, true));
  }, [campus, map]);
  useEffect(() => {
    if (hasStart && route && route.coordinates.length > 1) {
      map.flyToBounds(route.coordinates, { padding: [80, 80], maxZoom: 18, duration: 1 });
    } else if (destination) {
      map.flyTo([destination.lat, destination.lng], 18, { duration: 1.2 });
    } else if (markers.length) {
      map.fitBounds(markers.map((marker) => [marker.lat, marker.lng] as [number, number]), { padding: [45, 45], maxZoom: 17 });
    }
  }, [destination, hasStart, route, markers, map, campus]);

  return null;
}

function LocateButton({ location }: { location: UserLocationMarkerType | null }) {
  const map = useMap();
  return (
    <button
      type="button"
      aria-label="Centre on my location"
      disabled={!location}
      onClick={() => location && map.flyTo([location.lat, location.lng], 18, { duration: 0.8 })}
      className="absolute right-4 top-24 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-700 shadow-lg disabled:text-gray-400"
    >
      <Crosshair className="h-5 w-5" />
    </button>
  );
}

function UserLocationMarker({ location }: { location: UserLocationMarkerType }) {
  return (
    <>
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={Math.max(12, Math.min(location.accuracy / 5, 50))}
        pathOptions={{ color: '#60a5fa', fillColor: '#60a5fa', fillOpacity: 0.15, weight: 1.5, dashArray: '4 4' }}
      />
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={8}
        pathOptions={{ color: '#ffffff', fillColor: '#1769c2', fillOpacity: 0.95, weight: 3 }}
      >
        <Popup>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900">Your location</p>
            <p className="text-gray-600">Accuracy: ±{Math.round(location.accuracy)}m</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export default function Map({
  destination,
  markers = [],
  userLocation: initialUserLocation,
  showUserLocation = true,
  className = 'h-[500px] rounded-none md:rounded-[26px] border border-gray-300 shadow-md',
  onSelect,
  onRoute,
  profile = 'foot',
  campusId: controlledCampus,
  onCampusChange,
  fullScreen = false,
}: {
  destination?: CampusMapDestination;
  markers?: CampusMapRoom[];
  userLocation?: UserLocationMarkerType;
  showUserLocation?: boolean;
  className?: string;
  onSelect?: (id: string) => void;
  onRoute?: (route: CampusRouteInfo | null) => void;
  profile?: RouteProfile;
  campusId?: CampusId;
  onCampusChange?: (campus: CampusId) => void;
  fullScreen?: boolean;
}) {
  const [route, setRoute] = useState<CampusRouteInfo | null>(null);
  const [campusSelection, setCampusSelection] = useState<{ campus: CampusId; ignoredDestinationId?: string }>({ campus: "silverest" });
  const [routeError, setRouteError] = useState("");
  const destinationCampus = destination ? campusFor({ latitude: destination.lat, longitude: destination.lng }) : undefined;
  const campusId = controlledCampus ?? (destinationCampus && campusSelection.ignoredDestinationId !== destination?.id ? destinationCampus.id : campusSelection.campus);
  const campus = campuses.find((campus) => campus.id === campusId)!;
  const campusMarkers = useMemo(() => markers.filter((marker) => campusFor({ latitude: marker.lat, longitude: marker.lng })?.id === campusId), [markers, campusId]);
  const campusDestination = destinationCampus?.id === campusId ? destination : undefined;

  const activeUserLocation = showUserLocation && initialUserLocation && campusFor({ latitude: initialUserLocation.lat, longitude: initialUserLocation.lng })?.id === campusId ? initialUserLocation : null;
  const startLat = activeUserLocation?.lat;
  const startLng = activeUserLocation?.lng;

  // ~11m grid so GPS jitter does not retrigger the re-route check every second
  const startKey =
    startLat !== undefined && startLng !== undefined ? `${startLat.toFixed(4)},${startLng.toFixed(4)}` : null;
  const hasStart = startKey !== null;

  const startRef = useRef<[number, number] | null>(null);
  const lastFetchRef = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    startRef.current = startLat !== undefined && startLng !== undefined ? [startLat, startLng] : null;
  });

  // Fetch when a start exists and the destination/profile changes, or a re-route is requested.
  useEffect(() => {
    const start = startRef.current;
    if (!hasStart || !start || !campusDestination) {
        setRoute(null);
      onRoute?.(null);
      return;
    }
    const controller = new AbortController();
    lastFetchRef.current = Date.now();
    void fetchRoute(start, [campusDestination.lat, campusDestination.lng], profile, campusDestination.name, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        if (result.coordinates.some(([latitude, longitude]) => campusFor({ latitude, longitude })?.id !== campusId)) {
          setRoute(null); onRoute?.(null); setRouteError("The suggested route leaves this campus scope. Verify an on-campus pedestrian route."); return;
        }
        setRouteError("");
        setRoute(result);
        onRoute?.(result);
      }
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStart, campusDestination?.lat, campusDestination?.lng, profile, tick, campusId]);

  // Re-route only when the user leaves the path (or retry a failed road route).
  useEffect(() => {
    const start = startRef.current;
    if (!route || !start) return;
    if (Date.now() - lastFetchRef.current < REROUTE_MIN_INTERVAL_MS) return;
    const off =
      route.source === 'road' ? pathProgress(route.coordinates, start).offPath > REROUTE_DISTANCE_M : true;
    if (off) setTick((n) => n + 1);
  }, [startKey, route]);
  const routePoints = useMemo(() => {
    const points = route?.coordinates ?? [];
    return points.every(([latitude, longitude]) => campusFor({ latitude, longitude })?.id === campusId) ? points : [];
  }, [route, campusId]);

  return (
    <div className={`relative w-full overflow-hidden bg-gray-100 ${className}`}>
      <label className={`absolute left-3 top-24 z-[1000] max-w-[calc(100%-5rem)] rounded-lg bg-white p-2 text-sm text-gray-900 shadow ${fullScreen ? "xl:left-[470px]" : ""}`}>
        <span className="mr-2">UNILUS campus</span>
        <select className="max-w-full" aria-label="UNILUS campus" value={campusId} onChange={(event) => {
          setCampusSelection({ campus: event.target.value as CampusId, ignoredDestinationId: destination?.id });
          onCampusChange?.(event.target.value as CampusId);
        }}>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select>
      </label>
      {campus.scopeKind === "approximate" && <p role="status" className={`absolute left-3 top-40 z-[1000] max-w-[calc(100%-2rem)] rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950 shadow ${fullScreen ? "xl:left-[470px] xl:max-w-sm" : ""}`}>Massmedia: approximate Alick Nkhata Road area, not a verified campus boundary or pin. Official address: {campus.address}. Confirm room locations with campus staff.</p>}
      {initialUserLocation && !activeUserLocation && showUserLocation && <p role="status" className="absolute bottom-3 left-3 z-[1000] max-w-[85%] rounded bg-white p-2 text-xs text-gray-900 shadow">Your location is outside this campus scope. Campus navigation starts when you are within the mapped area.</p>}
      {destination && !destinationCampus && <p role="alert" className="absolute bottom-3 left-3 z-[1000] rounded bg-white p-2 text-xs text-red-700">This destination needs verified UNILUS campus coordinates.</p>}
      {routeError && activeUserLocation && campusDestination && <p role="alert" className="absolute bottom-3 left-3 z-[1000] max-w-[85%] rounded bg-white p-2 text-xs text-red-700">{routeError}</p>}
      <MapContainer
        center={campusDestination ? [campusDestination.lat, campusDestination.lng] : campus.centre}
        zoom={17}
        minZoom={15}
        maxBounds={campus.bounds}
        maxBoundsViscosity={1}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={TILE_URL}
          maxZoom={19}
          bounds={campus.bounds}
          noWrap
        />

        {campus.polygon.length > 0 && <>
        <Polygon positions={campus.polygon.map(([longitude, latitude]) => [latitude, longitude])} pathOptions={{ color: '#1769c2', fillOpacity: 0.05 }} interactive={false} />
        <Polygon positions={[
          [[-90, -180], [-90, 180], [90, 180], [90, -180]],
          campus.polygon.map(([longitude, latitude]): [number, number] => [latitude, longitude]),
        ]} pathOptions={{ stroke: false, fillColor: '#f1f5f9', fillOpacity: 0.92 }} interactive={false} />
        </>}
        <MapFocus destination={campusDestination} hasStart={hasStart} route={routePoints.length ? route : null} markers={campusMarkers} campusId={campusId} />
        <LocateButton location={activeUserLocation} />

        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#1769c2',
              weight: 6,
              opacity: 0.9,
              dashArray: route?.source === 'straight' ? '2 10' : undefined,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {activeUserLocation && <UserLocationMarker location={activeUserLocation} />}

        {campusMarkers.map((room) => (
          <CircleMarker
            key={room.id}
            center={[room.lat, room.lng]}
            eventHandlers={{ click: () => onSelect?.(room.id) }}
            radius={room.id === destination?.id ? 16 : 12}
            pathOptions={{
              color: room.available === false ? '#f59e0b' : '#1769c2',
              fillColor: room.available === false ? '#f59e0b' : '#93c5fd',
              fillOpacity: room.id === destination?.id ? 0.95 : 0.8,
              weight: room.id === destination?.id ? 3 : 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm text-gray-900">
                <p className="font-semibold">{room.name}</p>
                <p className="text-gray-600">{room.available === false ? 'Currently unavailable' : 'Open for use; check booking availability'}</p>
                {room.tag ? <p className="font-medium text-gray-700">{room.tag}</p> : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
