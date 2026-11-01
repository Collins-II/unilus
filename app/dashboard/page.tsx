"use client";

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowUpRight, CalendarCheck2, CalendarClock, CalendarDays, CreditCard, Gauge, GraduationCap, MessagesSquare, Pencil, Plus, RefreshCw, Settings, UserCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useChatUnread } from '@/lib/ChatUnreadContext';

import { AvailableRoomsPanel } from '@/components/dashboard/AvailableRoomsPanel';
import { BookingModal } from '@/components/dashboard/BookingModal';
import { PaymentModal } from '@/components/dashboard/PaymentModal';
import { ProfileModal } from '@/components/dashboard/ProfileModal';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import Loading from '../loading';
import { PageHeader, StatusBadge } from '@/components/ui/PageHeader';
import { BookingAccessNotice } from '@/components/bookings/BookingAccessNotice';
import type { BookingAccess } from '@/lib/booking-policy';

type DashboardSummary = {
  totalBookings: number;
  activeBookings: number;
  upcomingClasses: number;
  roomUsage: number;
};

type DashboardBooking = {
  id: string;
  purpose: string;
  room: string;
  roomCode: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  title?: string;
  tutorialGroup?: { groupName: string; courseCode: string; topic: string; leaderName: string };
  cancellationReason?: string;
  attendees?: number;
  conversationId?: string | null;
  startsAt?: string;
  endsAt?: string | null;
};

type DashboardProfile = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  phone: string;
  department: string;
  program: string;
  year: string;
  role: string;
};

type RoomOption = {
  id: string;
  name: string;
  code: string;
  floor: string;
  capacity: number;
  isAvailable?: boolean;
  description?: string;
};

const getLocalDateKey = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [summary, setSummary] = useState<DashboardSummary>({ totalBookings: 0, activeBookings: 0, upcomingClasses: 0, roomUsage: 0 });
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<DashboardBooking | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { unread: unreadMessages } = useChatUnread();
  const [preferredRoom, setPreferredRoom] = useState('');
  const [payment, setPayment] = useState<{
    paymentMethod: 'card' | 'mobile-money' | 'bank-transfer';
    provider: string;
    billingEmail: string;
    cardholderName: string;
    last4: string;
    status: 'verified' | 'pending' | 'inactive';
  } | null>(null);
  const [settings, setSettings] = useState<{
    notifications: { email: boolean; sms: boolean; push: boolean; weeklyDigest: boolean; };
    app: { compactMode: boolean; campusAlerts: boolean; autoConfirmBookings: boolean; darkMode: boolean; };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingAccess, setBookingAccess] = useState<BookingAccess | null>(null);

  const userName = profile?.name || session?.user?.name || 'Student';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const today = getLocalDateKey(new Date());
      const roomAvailabilityUrl = `/api/rooms?date=${today}&start=09:00&end=17:00`;

      const [overviewResponse, roomsResponse, paymentResponse, settingsResponse] = await Promise.all([
        fetch('/api/dashboard/overview'),
        fetch(roomAvailabilityUrl),
        fetch('/api/dashboard/payments'),
        fetch('/api/dashboard/settings'),
      ]);

      if (!overviewResponse.ok) {
        const overviewError = await overviewResponse.json().catch(() => ({ error: 'Unable to load dashboard data.' }));
        throw new Error(overviewError.error || 'Unable to load dashboard data.');
      }

      if (!roomsResponse.ok) {
        const roomError = await roomsResponse.json().catch(() => ({ error: 'Unable to load rooms.' }));
        throw new Error(roomError.error || 'Unable to load rooms.');
      }

      if (!paymentResponse.ok) {
        const paymentError = await paymentResponse.json().catch(() => ({ error: 'Unable to load payment details.' }));
        throw new Error(paymentError.error || 'Unable to load payment details.');
      }

      if (!settingsResponse.ok) {
        const settingsError = await settingsResponse.json().catch(() => ({ error: 'Unable to load settings.' }));
        throw new Error(settingsError.error || 'Unable to load settings.');
      }

      const overviewData = await overviewResponse.json();
      const roomsData = await roomsResponse.json();
      const paymentData = await paymentResponse.json();
      const settingsData = await settingsResponse.json();

      const activeRooms = Array.isArray(roomsData.rooms)
        ? roomsData.rooms.filter((room: RoomOption) => room.isAvailable !== false)
        : [];

      setProfile(overviewData.profile || null);
      setBookingAccess(overviewData.bookingAccess ?? null);
      setSummary(overviewData.summary || { totalBookings: 0, activeBookings: 0, upcomingClasses: 0, roomUsage: 0 });
      setBookings(Array.isArray(overviewData.bookings) ? overviewData.bookings.map((booking: DashboardBooking) => {
        const start = booking.startsAt ? new Date(booking.startsAt) : null;
        const end = booking.endsAt ? new Date(booking.endsAt) : null;
        return {
          ...booking,
          date: start ? getLocalDateKey(start) : booking.date,
          startTime: start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : booking.startTime,
          endTime: end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : booking.endTime,
        };
      }) : []);
      setRooms(activeRooms);
      setPayment(paymentData.payment || null);
      setSettings(settingsData.settings || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated') {
      void fetchDashboardData();
    }
  }, [status, router]);

  const stats = useMemo(
    () => [
      { label: 'Active bookings', value: String(summary.activeBookings), note: 'Pending or confirmed', icon: CalendarCheck2 },
      { label: 'Total bookings', value: String(summary.totalBookings), note: 'All time', icon: CalendarDays },
      { label: 'Upcoming classes', value: String(summary.upcomingClasses), note: 'From your timetable', icon: CalendarClock },
      { label: 'Room usage', value: `${summary.roomUsage}%`, note: 'Of your booked hours', icon: Gauge },
    ],
    [summary]
  );

  const todayBookings = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    return bookings.filter((booking) => booking.date === todayKey).slice(0, 4);
  }, [bookings]);


  const openBookingModal = (roomName?: string) => {
    setSelectedBooking(null);
    const nextPreferredRoom = roomName ?? rooms.find((room) => room.isAvailable !== false)?.name ?? '';
    setPreferredRoom(nextPreferredRoom);
    setBookingModalOpen(true);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="portal-content grid min-h-[50vh] place-items-center">
        <Loading />
      </div>
    );
  }

  const firstName = String(userName).split(' ')[0];
  const studentId = profile?.studentId || session?.user?.studentId || '';
  const programme = [profile?.program, profile?.department].filter(Boolean).join(' · ');
  const canBook = bookingAccess?.allowed !== false;

  return (
    <div className="portal-content">
      <PageHeader
        eyebrow="Student dashboard"
        title={`Welcome back, ${firstName}`}
        subtitle={programme || 'Your bookings, classes and campus activity at a glance.'}
        actions={
          <>
            <button type="button" className="secondary-button" onClick={() => setProfileModalOpen(true)}>
              <UserCircle2 size={16} /> Edit profile
            </button>
            {canBook && (
              <button type="button" className="primary-button" onClick={() => openBookingModal()}>
                <Plus size={16} /> New booking
              </button>
            )}
          </>
        }
      />

      {error ? (
        <div role="alert" className="form-error mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" className="small-button" onClick={() => void fetchDashboardData()}>
            <RefreshCw size={13} /> Try again
          </button>
        </div>
      ) : null}

      <div className="welcome-strip">
        <div>
          <span className="welcome-icon"><GraduationCap size={18} /></span>
          <span>
            <strong>{studentId ? `Student ID ${studentId}` : 'UNILUS student'}{profile?.year ? ` · Class of ${profile.year}` : ''}</strong>
            <span>
              {unreadMessages > 0
                ? `You have ${unreadMessages} unread study circle ${unreadMessages === 1 ? 'message' : 'messages'}.`
                : 'You are all caught up with your study circles.'}
            </span>
          </span>
        </div>
        <Link href="/chat">Open study circles <ArrowUpRight size={14} /></Link>
      </div>

      <div className="stats-grid">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={16} /></span></div>
            <strong className="stat-value">{value}</strong>
            <div className="stat-bottom"><small>{note}</small></div>
          </div>
        ))}
      </div>

      {!canBook ? (
        <div className="mb-5"><BookingAccessNotice access={bookingAccess} /></div>
      ) : (
        <div className="content-grid">
          <section className="app-panel" aria-labelledby="today-heading">
            <div className="panel-heading">
              <div>
                <h2 id="today-heading">Today&apos;s schedule</h2>
                <p>{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <button type="button" className="small-button" onClick={() => openBookingModal()}><Plus size={13} /> Add booking</button>
            </div>
            {todayBookings.length ? (
              <ul className="panel-list">
                {todayBookings.map((booking) => (
                  <li key={booking.id}>
                    <div className="row-main">
                      <span className="time-chip"><strong>{booking.startTime}</strong><small>{booking.endTime ? `to ${booking.endTime}` : 'start'}</small></span>
                      <span>
                        <strong>{booking.purpose}</strong>
                        <small>{booking.room}{booking.roomCode ? ` · ${booking.roomCode}` : ''}</small>
                      </span>
                    </div>
                    <div className="row-actions">
                      <StatusBadge status={booking.status} />
                      <button type="button" className="small-button" aria-label={`Edit ${booking.purpose}`} onClick={() => { setSelectedBooking(booking); setBookingModalOpen(true); }}>
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <CalendarDays size={26} />
                <h3>Nothing booked for today</h3>
                <p>Reserve a lecture room or study space and it will show up here.</p>
              </div>
            )}
            <Link href="/timetable" className="panel-footer">View timetable <ArrowUpRight size={13} /></Link>
          </section>

          <AvailableRoomsPanel rooms={rooms} />
        </div>
      )}

      <div className="content-grid">
        <section className="app-panel" aria-labelledby="recent-heading">
          <div className="panel-heading">
            <div>
              <h2 id="recent-heading">Recent bookings</h2>
              <p>{summary.totalBookings} total · synced with the UNILUS central admin</p>
            </div>
            <Link href="/bookings" className="text-link">View all <ArrowUpRight size={13} /></Link>
          </div>
          {bookings.length ? (
            <div className="table-scroll">
              <table className="app-table">
                <thead>
                  <tr><th>Booking</th><th>Date</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 5).map((booking) => (
                    <tr key={booking.id}>
                      <td><strong>{booking.purpose}</strong><small>{booking.room}</small></td>
                      <td className="whitespace-nowrap">{booking.date}<small>{booking.startTime}{booking.endTime ? ` – ${booking.endTime}` : ''}</small></td>
                      <td><StatusBadge status={booking.status} /></td>
                      <td className="text-right">
                        <span className="inline-flex gap-2">
                          <Link href={`/booking/${booking.id}`} className="small-button">Details</Link>
                          {canBook && booking.status !== 'cancelled' && (
                            <button type="button" className="small-button" onClick={() => { setSelectedBooking(booking); setPreferredRoom(booking.room); setBookingModalOpen(true); }}>
                              <Pencil size={12} /> Update
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <CalendarCheck2 size={26} />
              <h3>No bookings yet</h3>
              <p>Create your first campus booking to get started.</p>
              {canBook && <button type="button" className="primary-button" onClick={() => openBookingModal()}><Plus size={15} /> New booking</button>}
            </div>
          )}
        </section>

        <section className="app-panel" aria-labelledby="account-heading">
          <div className="panel-heading">
            <div>
              <h2 id="account-heading">Account</h2>
              <p>{profile?.email || session?.user?.email || 'Manage your student profile'}</p>
            </div>
          </div>
          <ul className="panel-list">
            {[
              { label: 'Profile', detail: 'Name, programme and contact details', icon: UserCircle2, onClick: () => setProfileModalOpen(true) },
              { label: 'Payment details', detail: payment ? `${payment.paymentMethod.replace('-', ' ')} · ${payment.status}` : 'Add a payment method', icon: CreditCard, onClick: () => setPaymentModalOpen(true) },
              { label: 'Settings', detail: 'Notifications and app preferences', icon: Settings, onClick: () => setSettingsModalOpen(true) },
            ].map(({ label, detail, icon: Icon, onClick }) => (
              <li key={label}>
                <div className="row-main">
                  <span className="stat-icon"><Icon size={16} /></span>
                  <span><strong>{label}</strong><small className="capitalize">{detail}</small></span>
                </div>
                <button type="button" className="small-button" onClick={onClick}>Manage</button>
              </li>
            ))}
            <li>
              <div className="row-main">
                <span className="stat-icon"><MessagesSquare size={16} /></span>
                <span><strong>Study circles</strong><small>{unreadMessages ? `${unreadMessages} unread` : 'No unread messages'}</small></span>
              </div>
              <Link href="/chat" className="small-button">Open</Link>
            </li>
          </ul>
        </section>
      </div>

      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        defaultRoomName={preferredRoom}
        onSaved={fetchDashboardData}
      />

      {profile ? (
        <ProfileModal
          open={profileModalOpen}
          profile={profile}
          onClose={() => setProfileModalOpen(false)}
          onSaved={fetchDashboardData}
        />
      ) : null}

      <PaymentModal
        open={paymentModalOpen}
        payment={payment}
        onClose={() => setPaymentModalOpen(false)}
        onSaved={fetchDashboardData}
      />

      <SettingsModal
        open={settingsModalOpen}
        settings={settings}
        onClose={() => setSettingsModalOpen(false)}
        onSaved={fetchDashboardData}
      />
    </div>
  );
}