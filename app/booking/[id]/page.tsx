'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Clock3, MapPin, Navigation, Users, XCircle } from 'lucide-react';

import { PageHeader, StatusBadge } from '@/components/ui/PageHeader';
import { BookingAccessNotice } from '@/components/bookings/BookingAccessNotice';
import type { BookingAccess } from '@/lib/booking-policy';

type BookingApiRecord = {
  _id?: string;
  id?: string;
  room?: { name?: string; code?: string; floor?: string } | string;
  purpose?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  attendees?: number;
  title?: string;
  tutorialGroup?: { groupName: string; courseCode: string; topic: string; leaderName: string };
  cancellationReason?: string;
  startsAt?: string;
  endsAt?: string;
  roomCode?: string;
  conversationId?: string | null;
};

const fmt = (value?: string, options?: Intl.DateTimeFormatOptions) =>
  value ? new Date(value).toLocaleString([], options) : '-';

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { status } = useSession();
  const [booking, setBooking] = useState<BookingApiRecord | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bookingAccess, setBookingAccess] = useState<BookingAccess | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setState('missing');
      return;
    }
    void (async () => {
      try {
        const response = await fetch('/api/bookings', { cache: 'no-store' });
        const data = await response.json();
        setBookingAccess(data.bookingAccess ?? null);
        if (!response.ok && data.bookingAccess?.allowed === false) {
          setBooking(null);
          setState('ready');
          return;
        }
        if (!response.ok) throw new Error(data.error || 'Unable to load booking details right now.');
        const found = (data.bookings ?? []).find((b: BookingApiRecord) => (b._id || b.id) === params.id);
        setBooking(found ?? null);
        setState(found ? 'ready' : 'missing');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load booking details right now.');
        setState('error');
      }
    })();
  }, [status, params.id, reloadKey]);

  const cancelBooking = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/bookings/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to cancel booking');
      setBooking((current) => (current ? { ...current, status: 'cancelled' } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel booking');
    } finally {
      setBusy(false);
    }
  };

  const room = typeof booking?.room === 'object' ? booking.room : { name: booking?.room };
  const roomName = room?.name || 'Campus room';
  const roomCode = booking?.roomCode || (room && 'code' in room ? room.code : undefined);
  const bookingStatus = booking?.status || 'pending';

  return (
    <div className="portal-content">
      <PageHeader eyebrow="Room bookings" title="Booking details" subtitle="Review your lecture room request and its approval status." backHref="/bookings" />

      {bookingAccess?.allowed === false ? <BookingAccessNotice access={bookingAccess} /> : state === 'loading' ? (
        <div className="app-panel h-64 animate-pulse" aria-busy="true" />
      ) : state === 'error' ? (
        <section role="alert" className="app-panel">
          <div className="empty-state">
            <AlertTriangle size={26} />
            <h3>Booking details unavailable</h3>
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError('');
                setState('loading');
                setReloadKey((key) => key + 1);
              }}
              className="secondary-button mt-4"
            >
              Try again
            </button>
          </div>
        </section>
      ) : state === 'missing' || !booking ? (
        <section className="app-panel">
          <div className="empty-state">
            <CalendarDays size={26} />
            <h3>Booking not found</h3>
            <p>It may have been removed, or it belongs to another account.</p>
            <Link href="/bookings" className="primary-button mt-4">Back to bookings</Link>
          </div>
        </section>
      ) : (
        <div className="content-grid">
          <section className="app-panel" aria-labelledby="booking-heading">
            <div className="panel-heading">
              <div className="min-w-0">
                <h2 id="booking-heading" className="break-words">{booking.title || booking.purpose || 'Campus booking'}</h2>
                <p>{booking.purpose}{booking.conversationId ? ' · Study circle' : ''}</p>
              </div>
              <StatusBadge status={bookingStatus} />
            </div>
            <dl className="panel-list">
              {[
                { icon: MapPin, label: 'Room', value: roomCode ? `${roomName} (${roomCode})` : roomName },
                { icon: CalendarDays, label: 'Date', value: fmt(booking.startsAt, { dateStyle: 'full' }) },
                { icon: Clock3, label: 'Time', value: `${fmt(booking.startsAt, { timeStyle: 'short' })} – ${fmt(booking.endsAt, { timeStyle: 'short' })}` },
                { icon: Users, label: 'Attendees', value: String(booking.attendees || 1) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="row-main px-5 py-3.5">
                  <span className="stat-icon"><Icon size={16} /></span>
                  <span>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
                    <dd className="break-words text-sm font-semibold text-[#1d2b41]">{value}</dd>
                  </span>
                </div>
              ))}
            </dl>
            {booking.tutorialGroup && (
              <div className="panel-body border-t border-[#e1e6ed] text-sm text-slate-600">
                <h3 className="mb-2 font-semibold text-[#1d2b41]">Tutorial group</h3>
                <p>{booking.tutorialGroup.groupName} · {booking.tutorialGroup.courseCode}</p>
                <p className="mt-1">Tutor / leader: {booking.tutorialGroup.leaderName}</p>
                <p className="mt-2 whitespace-pre-wrap">{booking.tutorialGroup.topic}</p>
              </div>
            )}
          </section>

          <section className="app-panel" aria-labelledby="actions-heading">
            <div className="panel-heading">
              <div>
                <h2 id="actions-heading">Actions</h2>
                <p>Get directions or release the room.</p>
              </div>
            </div>
            <div className="panel-body flex flex-col gap-3">
              {booking.cancellationReason === 'timetable_conflict' && <p role="status" className="form-error !mt-0">This booking was cancelled because a published class takes priority.</p>}
              {error ? <p role="alert" className="form-error !mt-0">{error}</p> : null}
              <Link href={`/navigation?destination=${encodeURIComponent(roomName)}`} className="primary-button w-full justify-center">
                <Navigation size={15} /> Directions to room
              </Link>
              {bookingStatus !== 'cancelled' ? (
                <button type="button" onClick={cancelBooking} disabled={busy} className="danger-button w-full justify-center">
                  <XCircle size={15} /> {busy ? 'Cancelling...' : 'Cancel booking'}
                </button>
              ) : null}
              <Link href="/bookings" className="secondary-button w-full justify-center">All bookings</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
