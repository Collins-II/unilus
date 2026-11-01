"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CalendarCheck2, CalendarDays, ChevronRight, ClipboardList, Clock3, Hourglass, Info, MapPin, RefreshCw, Users } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/PageHeader";
import { BookingForm } from "@/components/bookings/BookingForm";
import { BookingAccessNotice } from "@/components/bookings/BookingAccessNotice";
import type { BookingAccess } from "@/lib/booking-policy";

type BookingRecord = {
  id: string;
  room: string;
  purpose: string;
  title?: string;
  startsAt: string;
  endsAt?: string;
  attendees: number;
  status: string;
  cancellationReason?: string;
  conversationId?: string | null;
};

function BookingsContent() {
  const { status } = useSession();
  const params = useSearchParams();
  const circleId = params.get("circle") ?? "";
  const roomId = params.get("room") ?? "";
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingAccess, setBookingAccess] = useState<BookingAccess | null>(null);
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const [now, setNow] = useState(() => Date.now());

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const data = await response.json();
      setBookingAccess(data.bookingAccess ?? null);
      if (!response.ok && data.bookingAccess?.allowed === false) {
        setBookings([]);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to load your bookings.");
      setBookings(data.bookings);
      setNow(Date.now());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load your bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadBookings();
  }, [status, loadBookings]);

  const upcoming = bookings.filter((booking) => booking.status !== "cancelled" && new Date(booking.startsAt).getTime() >= now);
  const pending = bookings.filter((booking) => booking.status === "pending").length;
  const confirmed = upcoming.filter((booking) => booking.status === "confirmed").length;
  const visible = filter === "upcoming" ? upcoming : bookings;
  const stats = [
    { label: "Upcoming", value: upcoming.length, note: "Scheduled ahead", icon: CalendarDays },
    { label: "Awaiting approval", value: pending, note: "Reviewed by campus admin", icon: Hourglass },
    { label: "Confirmed", value: confirmed, note: "Upcoming and approved", icon: CalendarCheck2 },
    { label: "All requests", value: bookings.length, note: "Your booking history", icon: ClipboardList },
  ];

  return (
    <div className="portal-content">
      <PageHeader
        eyebrow="Campus spaces"
        title="Room bookings"
        subtitle="Request lecture rooms for tutorials and events, then track campus approval in one place."
        actions={<Link href="/chat" className="secondary-button"><Users size={15} /> Study circles</Link>}
      />

      <div className="welcome-strip">
        <div>
          <span className="welcome-icon"><Info size={18} /></span>
          <span>
            <strong>Booking windows</strong>
            <span><b>Tutorial groups</b> need 48+ hours notice · <b>Campus events</b> are booked 7–14 days ahead. Lecture rooms only.</span>
          </span>
        </div>
      </div>

      {status === "loading" || (loading && bookingAccess === null) ? (
        <div aria-busy="true" className="app-panel h-80 animate-pulse" />
      ) : bookingAccess?.allowed === false ? (
        <BookingAccessNotice access={bookingAccess} />
      ) : (
        <>
          <div className="stats-grid">
            {stats.map(({ label, value, note, icon: Icon }) => (
              <div key={label} className="stat-card">
                <div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={16} /></span></div>
                <strong className="stat-value">{value}</strong>
                <div className="stat-bottom"><small>{note}</small></div>
              </div>
            ))}
          </div>

          <div className="content-grid even">
            <section className="app-panel" aria-labelledby="request-heading">
              <div className="panel-heading">
                <div>
                  <h2 id="request-heading">Request a lecture room</h2>
                  <p>Choose a purpose to see the right booking window.</p>
                </div>
              </div>
              <div className="panel-body">
                <BookingForm key={`${circleId}:${roomId}`} defaultCircleId={circleId} defaultRoomId={roomId} onSaved={() => void loadBookings()} />
              </div>
            </section>

            <section className="app-panel" aria-labelledby="requests-heading">
              <div className="panel-heading">
                <div>
                  <h2 id="requests-heading">Booking requests</h2>
                  <p>Synced with the UNILUS central admin.</p>
                </div>
                <button type="button" className="small-button" onClick={() => void loadBookings()} disabled={loading}>
                  <RefreshCw size={12} className={loading ? "spin" : undefined} /> Refresh
                </button>
              </div>
              <div className="filter-tabs px-5 !mb-0" role="tablist" aria-label="Filter bookings">
                {(["upcoming", "all"] as const).map((value) => (
                  <button type="button" role="tab" key={value} aria-selected={filter === value} onClick={() => setFilter(value)} className={filter === value ? "active" : ""}>
                    {value === "upcoming" ? "Upcoming" : "All requests"}
                    <span>{value === "upcoming" ? upcoming.length : bookings.length}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div aria-busy="true" className="m-5 h-40 animate-pulse rounded-lg bg-slate-100" />
              ) : error ? (
                <div role="alert" className="form-error m-5 flex flex-wrap items-center justify-between gap-3">
                  <span>{error}</span>
                  <button type="button" className="small-button" onClick={() => void loadBookings()}>Try again</button>
                </div>
              ) : visible.length === 0 ? (
                <div className="empty-state">
                  <CalendarDays size={26} />
                  <h3>{filter === "upcoming" ? "No upcoming requests" : "No booking history yet"}</h3>
                  <p>{filter === "upcoming" ? "Use the form to plan your next tutorial or event." : "Your booking history will appear here."}</p>
                </div>
              ) : (
                <ul className="panel-list !border-t-0">
                  {visible.map((booking) => {
                    const start = new Date(booking.startsAt);
                    return (
                      <li key={booking.id} className="!p-0">
                        <Link href={`/booking/${booking.id}`} className="group flex w-full min-w-0 items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                          <span className="time-chip"><small>{start.toLocaleDateString([], { month: "short" })}</small><strong>{start.getDate()}</strong></span>
                          <span className="min-w-0 flex-1">
                            <strong>{booking.title || booking.purpose}</strong>
                            <small className="flex flex-wrap gap-x-3 gap-y-1">
                              <span className="inline-flex items-center gap-1"><MapPin size={12} />{booking.room}</span>
                              <span className="inline-flex items-center gap-1"><Clock3 size={12} />{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              <span className="inline-flex items-center gap-1"><Users size={12} />{booking.attendees}</span>
                              {booking.conversationId ? <span>Study circle</span> : null}
                            </small>
                            {booking.cancellationReason === "timetable_conflict" && <small className="!text-rose-700">Cancelled: a published class takes priority.</small>}
                          </span>
                          <StatusBadge status={booking.status} />
                          <ChevronRight size={16} className="shrink-0 text-slate-400 group-hover:text-[#1769c2]" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href="/chat" className="panel-footer">Bringing your study circle? Circles with 50+ members can book tutorials <ArrowUpRight size={13} /></Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
export default function BookingsPage() {
  return <Suspense fallback={<div className="portal-content"><div aria-busy="true" className="app-panel h-80 animate-pulse" /></div>}><BookingsContent /></Suspense>;
}
