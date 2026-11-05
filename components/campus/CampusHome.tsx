'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  Clock,
  Footprints,
  Locate,
  MapPin,
  Navigation,
  RotateCw,
  Search,
  X,
} from 'lucide-react';

import { CampusNavbar } from '@/components/ui/CampusNavbar';
import { calculateDistance } from '@/lib/useGeolocation';
import { useUserLocation } from '@/lib/LocationContext';
import type { CampusRouteInfo } from '@/components/Map';
import { BookingAccessNotice } from '@/components/bookings/BookingAccessNotice';
import type { BookingAccess } from '@/lib/booking-policy';
import { localDateKey } from '@/lib/booking-policy';
import { campuses, campusFor, type CampusId } from '@/lib/campus-geography';

const CampusMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div role="status" className="absolute inset-0 grid place-items-center bg-emerald-50 text-sm font-semibold text-emerald-800">
      Loading the UNILUS campus map...
    </div>
  ),
});

type CampusLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag: string;
};

type RoomRecord = { id: string; isAvailable?: boolean };

type DashboardBooking = {
  id: string;
  purpose: string;
  room: string;
  roomCode: string;
  date: string;
  startTime: string;
  status: string;
};

type ApiLocation = {
  _id?: string;
  id?: string;
  name: string;
  building?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  location?: { coordinates?: [number, number] };
};

const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;

const walkMinutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

export default function Home() {
  const { data: session, status } = useSession();
  const { location: userLocation, tracking, loading: locating, error: locationError, startTracking } = useUserLocation();

  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [locationsState, setLocationsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [roomsUnavailable, setRoomsUnavailable] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [homeDataError, setHomeDataError] = useState('');
  const [bookingAccess, setBookingAccess] = useState<BookingAccess | null>(null);
  const [snap, setSnap] = useState<'peek' | 'half' | 'full'>('half');
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const homeRequest = useRef(0);
  const sheetTouchY = useRef<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<CampusRouteInfo | null>(null);
  const [campusChoice, setCampusChoice] = useState<CampusId | null>(null);
  const [assignedCampus, setAssignedCampus] = useState<CampusId | null>(null);
  const campusId = campusChoice ?? assignedCampus ?? 'silverest';
  const campusLocations = useMemo(() => locations.filter((location) => campusFor({ latitude: location.lat, longitude: location.lng })?.id === campusId), [locations, campusId]);

  const isAuthenticated = status === 'authenticated';
  const firstName = (session?.user?.name || 'Student').split(' ')[0];

  useEffect(() => {
    const controller = new AbortController();

    const fetchLocations = async () => {
      setLocationsState('loading');
      try {
        const res = await fetch('/api/locations', { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load locations');
        const raw: ApiLocation[] = json.data ?? json.locations;
        if (!Array.isArray(raw)) throw new Error('Invalid campus location response');

        const mapped: CampusLocation[] = (Array.isArray(raw) ? raw : []).flatMap((item, index) => {
          const lat = item.latitude ?? item.location?.coordinates?.[1];
          const lng = item.longitude ?? item.location?.coordinates?.[0];
          if (typeof lat !== 'number' || typeof lng !== 'number' ||
              !Number.isFinite(lat) || !Number.isFinite(lng) ||
              Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
          return [{
            id: item._id || item.id || `loc-${index}`,
            name: item.name,
            lat,
            lng,
            tag: item.category || item.building || 'Campus',
          }];
        });
        setLocations(mapped);
        setSelectedId((cur) => (cur && mapped.some((m) => m.id === cur) ? cur : null));
        setLocationsState('ready');
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Campus locations could not be loaded:', err);
          setLocations([]);
          setSelectedId(null);
          setLocationsState('error');
        }
      }
    };
    void fetchLocations();
    return () => controller.abort();
  }, [reloadKey]);

  const loadHomeData = useCallback(
    async (signal?: AbortSignal) => {
      const request = ++homeRequest.current;
      const current = () => !signal?.aborted && request === homeRequest.current;
      const todayKey = localDateKey(new Date());
      const roomsTask = async () => {
        if (!isAuthenticated) {
          setRooms([]); setRoomsUnavailable(false); setRoomsLoading(false); return '';
        }
        setRoomsLoading(true);
        try {
          const response = await fetch(`/api/rooms?date=${todayKey}&start=09:00&end=17:00`, { signal });
          const data = await response.json();
          if (!current()) return '';
          if (!response.ok) throw new Error(data.error || 'Room availability could not be loaded.');
          if (!Array.isArray(data.rooms)) throw new Error('Invalid room availability response.');
          setRooms(data.rooms.filter((room: RoomRecord) => campusLocations.some((location) => location.id === room.id)));
          setRoomsUnavailable(false);
          return '';
        } catch (error) {
          if (!current()) return '';
          console.error('Room availability could not be loaded:', error);
          setRooms([]);
          setRoomsUnavailable(true);
          return 'Room availability is temporarily unavailable.';
        } finally {
          if (current()) setRoomsLoading(false);
        }
      };

      const bookingsTask = async () => {
        if (!isAuthenticated) {
          setBookings([]);
          setBookingAccess(null);
          setAssignedCampus(null);
          return '';
        }
        try {
          const response = await fetch('/api/dashboard/overview', { signal });
          const data = await response.json();
          if (!current()) return '';
          if (!response.ok) throw new Error(data.error || 'Your bookings could not be loaded.');
          setBookingAccess(data.bookingAccess ?? null);
          if (campuses.some((campus) => campus.id === data.profile?.campus)) setAssignedCampus(data.profile.campus);
          else setAssignedCampus(null);
          setBookings(Array.isArray(data.bookings) ? data.bookings : []);
          return '';
        } catch (error) {
          if (!current()) return '';
          setBookings([]);
          setBookingAccess(null);
          return error instanceof Error ? error.message : 'Your booking summary is temporarily unavailable.';
        }
      };

      const errors = await Promise.all([roomsTask(), bookingsTask()]);
      if (current()) setHomeDataError(errors.filter(Boolean).join(' '));
    },
    [isAuthenticated, campusLocations]
  );

  useEffect(() => {
    if (status === 'loading') return;
    const controller = new AbortController();

    void loadHomeData(controller.signal);

    const onVisible = () => {
      if (!document.hidden) void loadHomeData(controller.signal);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, loadHomeData]);
  const selected = campusLocations.find((l) => l.id === selectedId) ?? null;
  const mapMarkers = useMemo(
    () => campusLocations.map(({ id, name, lat, lng, tag }) => ({ id, name, lat, lng, tag })),
    [campusLocations]
  );

  const withDistance = useMemo(
    () =>
      campusLocations.map((loc) => ({
        ...loc,
        distance: userLocation
          ? calculateDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
          : null,
      })),
    [campusLocations, userLocation]
  );

  const deferredQuery = useDeferredValue(searchQuery);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(campusLocations.map((l) => l.tag)))],
    [campusLocations]
  );

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return withDistance
      .filter((l) => category === 'All' || l.tag === category)
      .filter((l) => !q || `${l.name} ${l.tag}`.toLowerCase().includes(q))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.name.localeCompare(b.name));
  }, [withDistance, deferredQuery, category]);

  const freeRooms = rooms.filter((r) => r.isAvailable === true).length;
  const availabilityLabel = !isAuthenticated ? 'Sign in to check lecture-room availability' : roomsLoading
    ? 'Checking rooms...'
    : roomsUnavailable
      ? 'Room availability unavailable'
      : `${freeRooms} rooms available today, 09:00–17:00`;
  const todayKey = localDateKey(new Date());
  const currentTime = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lusaka', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const nextBooking = bookings
    .filter((b) => b.status !== 'cancelled' && (b.date > todayKey || (b.date === todayKey && b.startTime >= currentTime)))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];

  const select = (id: string) => {
    setSelectedId(id);
    setSnap((s) => (s === 'full' ? 'half' : s));
  };

  useEffect(() => {
    if (!selectedId) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-loc-id="${CSS.escape(selectedId)}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, snap]);

  return (
    <main id="main-content" tabIndex={-1} className="fixed inset-0 overflow-hidden bg-emerald-50 text-gray-900">
      <CampusMap
        fullScreen
        className="absolute inset-0 h-full"
        destination={selected ?? undefined}
        markers={mapMarkers}
        onSelect={select}
        onRoute={setRouteInfo}
        userLocation={userLocation ?? undefined}
        campusId={campusId}
        onCampusChange={(campus) => { setCampusChoice(campus); setSelectedId(null); setCategory('All'); setSearchQuery(''); setRouteInfo(null); }}
      />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4 md:px-6 md:pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <CampusNavbar />
      </header>

      {/* Bottom sheet (mobile) / side panel (desktop) */}
      <section
        aria-label="Campus places"
        className={`absolute inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[999] flex min-h-0 flex-col overflow-hidden rounded-t-3xl border-t-4 border-emerald-600 bg-white shadow-[0_-12px_40px_rgba(5,46,22,0.15)] transition-[height] duration-300 ease-out motion-reduce:transition-none xl:inset-x-auto xl:bottom-6 xl:left-6 xl:top-28 xl:h-auto xl:w-[420px] xl:rounded-2xl xl:shadow-2xl ${
          snap === 'peek'
            ? 'h-auto max-h-[calc(100dvh-144px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:max-h-[calc(100dvh-172px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]'
            : snap === 'half'
              ? 'h-[min(65dvh,calc(100dvh-144px-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] sm:h-[min(65dvh,calc(100dvh-172px-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]'
              : 'h-[calc(100dvh-144px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-172px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]'
        }`}
      >
        <div
          className="shrink-0 xl:hidden"
          onTouchStart={(e) => {
            sheetTouchY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (sheetTouchY.current === null) return;
            const dy = e.changedTouches[0].clientY - sheetTouchY.current;
            sheetTouchY.current = null;
            if (dy < -40) setSnap((s) => (s === 'peek' ? 'half' : 'full'));
            else if (dy > 40) setSnap((s) => (s === 'full' ? 'half' : 'peek'));
          }}
        >
          <button
            type="button"
            aria-label={snap === 'full' ? 'Collapse panel' : 'Expand panel'}
            aria-expanded={snap !== 'peek'}
            onClick={() => setSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'))}
            className="flex h-8 w-full touch-none items-center justify-center"
          >
            <span className="h-1.5 w-12 rounded-full bg-gray-300" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain xl:contents">
        <div className="shrink-0 px-4 pb-2 pt-0 xl:max-h-[45%] xl:overflow-y-auto xl:overscroll-contain xl:px-5 xl:pt-5">
          <div>
            <label className="block text-xs font-bold text-[#1769c2]"><span className="sr-only">Campus places selection</span><select aria-label="Campus places selection" className="h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 xl:h-8 xl:w-auto xl:border-0 xl:px-0" value={campusId} onChange={(event) => { setCampusChoice(event.target.value as CampusId); setSelectedId(null); setCategory('All'); setSearchQuery(''); setRouteInfo(null); }}>{campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}</select></label>
            {campusId === 'massmedia' && <p className="mt-1 text-xs text-amber-800">Approximate Alick Nkhata Road area, not a verified campus boundary or pin.</p>}
            <h1 className={`mt-2 text-lg font-extrabold leading-tight tracking-tight sm:text-xl xl:text-2xl ${snap === 'peek' ? 'hidden xl:block' : ''}`}>
              {isAuthenticated ? `Hi ${firstName}, where to?` : 'Find your way at UNILUS.'}
            </h1>
            <p className="mt-1 hidden text-xs leading-relaxed text-gray-500 xl:block">Your campus, connected. Find a place and get walking directions.</p>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <Search className="h-5 w-5 shrink-0 text-gray-500" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Search campus places"
              value={searchQuery}
              onFocus={() => setSnap((s) => (s === 'peek' ? 'half' : s))}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search buildings, labs, halls"
              className="h-11 w-full min-w-0 bg-transparent text-base font-medium outline-none placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="flex h-8 w-8 shrink-0 items-center justify-center"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
          <div className={`mt-3 grid-cols-2 gap-2 ${snap !== 'full' ? 'hidden xl:grid' : 'grid'}`}>
            <Link href="/bookings" className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
              <Building2 className="h-4 w-4" /> Book a room
            </Link>
            <Link href="/timetable" className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              <CalendarDays className="h-4 w-4" /> My timetable
            </Link>
            <Link href="/assessments" className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><CalendarDays className="h-4 w-4 shrink-0" /> Quizzes, tests & exams</Link>
          </div>

          {bookingAccess?.allowed === false && (
            <div className="mt-2"><BookingAccessNotice access={bookingAccess} /></div>
          )}
          {homeDataError ? (
            <div role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-amber-900">{homeDataError}</p>
              <button
                type="button"
                onClick={() => void loadHomeData()}
                className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Retry
              </button>
            </div>
          ) : null}

          {categories.length > 1 && (
            <div className={`-mx-4 mt-2 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] xl:-mx-5 xl:px-5 ${snap === 'peek' ? 'hidden xl:flex' : 'flex'}`}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition ${
                    category === cat ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-emerald-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <p role="status" className={`shrink-0 px-4 py-2 text-[11px] font-semibold text-gray-500 xl:px-5 ${snap === 'peek' ? 'hidden xl:block' : ''}`}>
          {locationsState === 'loading' ? 'Loading campus places...' : locationsState === 'error' ? 'Campus places unavailable' : `${results.length} ${results.length === 1 ? 'place' : 'places'}${searchQuery || category !== 'All' ? ' found' : ' to explore'}`}
        </p>
        <div
          ref={listRef}
          tabIndex={0}
          aria-label="Scrollable campus locations"
          className={`border-t border-gray-100 px-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain [-webkit-overflow-scrolling:touch] ${snap === 'peek' ? 'hidden xl:block' : ''}`}
        >
          {locationsState === 'loading' ? (
            <ul aria-busy="true" className="space-y-1 p-2">
              {[0, 1, 2, 3].map((n) => (
                <li key={n} className="h-14 animate-pulse rounded bg-gray-100" />
              ))}
            </ul>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              <p>
                {locationsState === 'error'
                  ? 'Campus places could not be loaded. Check your connection and try again.'
                  : campusLocations.length === 0
                    ? 'No verified places have been published for this campus yet.'
                    : 'No places match your search.'}
              </p>
              {locationsState === 'error' ? (
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-3 inline-flex h-11 items-center gap-2 rounded border-2 border-black px-4 text-xs font-black uppercase tracking-widest"
                >
                  <RotateCw className="h-4 w-4" /> Retry
                </button>
              ) : searchQuery || category !== 'All' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategory('All');
                  }}
                  className="mt-3 inline-flex h-11 items-center rounded border-2 border-black px-4 text-xs font-black uppercase tracking-widest"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <ul>
              {results.map((loc, i) => (
                <li key={loc.id} data-loc-id={loc.id} className="border-b border-gray-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => select(loc.id)}
                    aria-current={loc.id === selected?.id}
                    className={`flex min-h-[60px] w-full items-center gap-3 px-2 py-2.5 text-left transition active:bg-gray-100 ${
                      loc.id === selected?.id ? 'bg-green-50 shadow-[inset_4px_0_0_0_#1769c2]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-7 shrink-0 text-center text-xl font-black tabular-nums text-gray-300">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-bold tracking-tight">{loc.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs font-semibold text-gray-500">
                        <MapPin className="h-3 w-3 shrink-0" /> {loc.tag}
                      </span>
                    </span>
                    {loc.distance !== null && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                        {formatDistance(loc.distance)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>

        {/* Selected destination action bar */}
        <div className="max-h-[60%] shrink-0 overflow-y-auto overscroll-contain border-t border-gray-200 bg-white px-4 pb-3 pt-3 xl:max-h-[35%] xl:px-5">
          <div className="mb-2 min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-tight">{selected?.name ?? 'Choose a destination'}</p>
            <p className="flex flex-wrap items-center gap-x-3 text-xs font-semibold text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5" />
                {!selected
                  ? 'Tap a place on the map or list'
                  : routeInfo
                    ? `${routeInfo.source === 'straight' ? '≈ ' : ''}${formatDistance(routeInfo.distance)} · ~${walkMinutes(routeInfo.duration)} min walk${routeInfo.source === 'straight' ? ' (approx.)' : ''}`
                    : userLocation
                      ? campusFor({ latitude: userLocation.lat, longitude: userLocation.lng })?.id === campusId
                        ? 'Select Start navigation for route details'
                        : 'Your location is outside this campus scope'
                      : 'Turn on location for distance'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {availabilityLabel}
              </span>
            </p>
          </div>
          {!userLocation ? (
            <>
              <button
                type="button"
                onClick={startTracking}
                disabled={locating}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
              >
                <Locate className="h-5 w-5" /> {locating ? 'Finding you…' : tracking ? 'Retry location' : 'Use my location'}
              </button>
              {(locationError || snap === 'full') && (
                <p role={locationError ? 'alert' : undefined} className="mt-1.5 text-center text-[11px] font-semibold text-gray-600">
                  {locationError || 'Navigation uses your real position. Allow location to get directions.'}
                </p>
              )}
            </>
          ) : selected ? (
            <Link
              href={`/navigation?id=${encodeURIComponent(selected.id)}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
            >
              <Navigation className="h-5 w-5" /> Start navigation
            </Link>
          ) : (
            <div className="flex h-12 w-full items-center justify-center rounded bg-gray-100 text-xs font-black uppercase tracking-widest text-gray-500">
              Pick a destination
            </div>
          )}
          {nextBooking && snap !== 'peek' && (
            <Link
              href="/bookings"
              className="mt-2 flex items-center gap-3 rounded-xl bg-emerald-950 px-3 py-2.5 text-sm text-white"
            >
              <CalendarDays className="h-5 w-5 shrink-0 text-[#60a5fa]" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{nextBooking.purpose}</span> · {nextBooking.room}
                <span className="block text-[11px] text-emerald-200">{nextBooking.date === todayKey ? 'Today' : nextBooking.date}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 font-bold text-[#60a5fa]">
                <Clock className="h-4 w-4" /> {nextBooking.startTime}
              </span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
