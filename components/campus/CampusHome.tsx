"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Compass, LayoutGrid, List, LocateFixed, MapPin, Megaphone, Search, Users } from "lucide-react";
import { campusPlaces, filterCampusPlaces, type CampusPlace } from "@/lib/campus";
import { useUserLocation } from "@/lib/LocationContext";

const CampusMap = dynamic(() => import("@/components/Map"), { ssr: false, loading: () => <div className="grid h-[430px] place-items-center bg-slate-100 text-sm text-slate-500">Loading campus map...</div> });
type Announcement = { _id: string; title: string; message: string; priority: string; createdAt: string };
const services = [
  { icon: Compass, title: "Find your way", copy: "A new lecture room? We will point you in the right direction.", href: "/navigation", label: "Open navigator" },
  { icon: CalendarDays, title: "Make room for ideas", copy: "Request a lecture room for your next tutorial or campus event.", href: "/bookings", label: "Book a space" },
  { icon: BookOpen, title: "Own your week", copy: "Your published classes, rooms and times. All in one place.", href: "/timetable", label: "View timetable" },
  { icon: Users, title: "Better, together", copy: "Find your people. Share notes and build your study circle.", href: "/chat", label: "Connect with students" },
];

export default function CampusHome() {
  const { status, data: session } = useSession();
  const [places, setPlaces] = useState<CampusPlace[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementError, setAnnouncementError] = useState("");
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const { location, tracking, loading: locationLoading, error: locationError, startTracking, stopTracking } = useUserLocation();

  const loadPlaces = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/locations", { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Campus places could not be loaded.");
      if (!Array.isArray(payload.data)) throw new Error("The campus service returned an invalid location list.");
      setPlaces(campusPlaces(payload.data));
      setState("ready");
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "Campus places could not be loaded.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlaces(controller.signal);
    return () => controller.abort();
  }, [loadPlaces]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    async function load() {
      setAnnouncementsLoading(true);
      setAnnouncementError("");
      try {
        const response = await fetch("/api/campus-data?type=announcements", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Announcements are unavailable.");
        if (!Array.isArray(data.announcements)) throw new Error("The campus service returned an invalid announcement list.");
        setAnnouncements(data.announcements);
      } catch (cause) {
        if (!controller.signal.aborted) setAnnouncementError(cause instanceof Error ? cause.message : "Announcements are unavailable.");
      } finally {
        if (!controller.signal.aborted) setAnnouncementsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [status]);

  const categories = useMemo(() => [...new Set(places.map((place) => place.category))].sort(), [places]);
  const filtered = useMemo(() => filterCampusPlaces(places, query, category), [places, query, category]);
  const selected = filtered.find((place) => place.id === selectedId);
  const markers = useMemo(() => filtered.flatMap((place) => place.lat !== null && place.lng !== null ? [{ id: place.id, name: place.name, lat: place.lat, lng: place.lng, available: place.isAvailable, tag: place.category }] : []), [filtered]);
  const destination = selected && selected.lat !== null && selected.lng !== null ? { id: selected.id, name: selected.name, lat: selected.lat, lng: selected.lng } : undefined;

  return (
    <div>
      <section className="campus-hero">
        <div className="campus-container relative z-10 grid items-center gap-10 py-14 md:grid-cols-[1.25fr_0.75fr] md:py-20">
          <div>
            <p className="campus-eyebrow text-blue-200"><span className="h-1.5 w-1.5 rounded-full bg-blue-300" /> THE UNIVERSITY OF LUSAKA, AT YOUR FINGERTIPS</p>
            <h1 className="mt-7 text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">Your campus.<br /><span className="text-[var(--brand-highlight)]">Your next chapter.</span></h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">Find your lecture. Find your people. Find your place.<br className="hidden sm:block" /> A little less searching. A lot more university.</p>
            <div className="mt-8 flex flex-wrap items-center gap-7">
              <a href="#explore" className="drive-button">Explore your campus <ArrowDown size={17} /></a>
              <Link href="/navigation" className="inline-flex items-center gap-2 text-sm font-medium hover:text-blue-200">Get directions <ArrowUpRight size={17} /></Link>
            </div>
          </div>
          <div aria-hidden="true" className="campus-compass-art hidden md:grid">
            <div className="campus-orbit"><span className="campus-orbit-label">LEARN. CONNECT. EXPLORE.</span><Compass size={150} strokeWidth={0.65} /><span className="campus-orbit-north">N</span></div>
            <div className="campus-art-caption"><MapPin size={15} /> A world of possibility. One campus companion.</div>
          </div>
        </div>
        <div className="border-t border-white/10"><div className="campus-container flex flex-wrap items-center justify-between gap-3 py-5 text-[10px] font-medium uppercase tracking-widest text-slate-300"><span>FIND YOUR PLACE. MAKE YOUR MARK.</span><span className="flex items-center gap-2"><Compass size={15} className="text-blue-300" /> Built for life at UNILUS</span></div></div>
      </section>

      <section className="border-b border-border bg-white">
        <div className="campus-container grid grid-cols-2 gap-6 py-7 lg:grid-cols-4">
          {services.map(({ icon: Icon, title, href }, index) => <Link key={href} href={href} className={`group flex items-center gap-3 ${index ? "lg:border-l lg:border-border lg:pl-7" : ""}`}><Icon size={20} strokeWidth={1.6} className="shrink-0 text-primary" /><span className="text-xs font-semibold text-slate-700 group-hover:text-primary">{title}</span><ArrowUpRight className="ml-auto hidden h-3.5 w-3.5 text-slate-400 sm:block" /></Link>)}
        </div>
      </section>

      <section id="explore" className="campus-container scroll-mt-6 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="campus-eyebrow text-slate-500">01 / EXPLORE</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-ink)] sm:text-4xl">Where are you headed?</h2><p className="mt-3 text-sm text-slate-500">Discover the spaces that make up your university.</p></div>
          <div className="flex rounded-lg border border-border bg-white p-1">{([{ name: "map", icon: LayoutGrid }, { name: "list", icon: List }] as const).map(({ name, icon: Icon }) => <button key={name} type="button" aria-pressed={view === name} onClick={() => setView(name)} className={`flex min-h-10 items-center gap-2 rounded px-4 text-xs font-semibold capitalize ${view === name ? "bg-[var(--brand-ink)] text-white" : "text-slate-500"}`}><Icon size={14} />{name}</button>)}</div>
        </div>
        <div className="mt-7 flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-3 px-2"><Search size={19} className="shrink-0 text-slate-400" /><span className="sr-only">Search campus places</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rooms, buildings, or a place..." className="min-h-11 w-full bg-transparent text-sm outline-none" /></label>
          <label className="sr-only" htmlFor="place-category">Place category</label>
          <select id="place-category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-lg border border-border bg-slate-50 px-4 text-sm sm:max-w-52"><option value="all">All campus spaces</option>{categories.map((name) => <option key={name}>{name}</option>)}</select>
          <button type="button" onClick={tracking ? stopTracking : startTracking} className="ui-btn ui-btn-secondary"><LocateFixed size={16} />{locationLoading ? "Locating..." : tracking ? "Location on" : "Use my location"}</button>
        </div>
        {locationError && <p role="alert" className="mt-3 text-sm text-red-700">{locationError}</p>}
        {state === "loading" ? <div role="status" className="mt-5 grid h-80 place-items-center rounded-xl border border-border bg-white text-sm text-slate-500">Loading your campus spaces...</div> : state === "error" ? <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-7"><h3 className="font-semibold text-slate-900">Campus directory unavailable</h3><p className="mt-2 text-sm text-amber-900">{error}</p><button type="button" onClick={() => void loadPlaces()} className="ui-btn ui-btn-secondary mt-4">Try again</button></div> : <>
          <p aria-live="polite" className="my-4 text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? "space" : "spaces"}{query && ` matching "${query}"`}<span className="mx-2 text-slate-300">/</span>Directory maintained by campus administration</p>
          {!filtered.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><MapPin className="mx-auto text-primary" size={28} /><h3 className="mt-3 font-semibold">{places.length ? "No spaces match your search" : "Your campus directory is getting ready"}</h3><p className="mt-2 text-sm text-slate-500">{places.length ? "Try a different name or category." : "Published spaces will appear here when campus administration adds them."}</p>{(query || category !== "all") && <button type="button" className="ui-btn ui-btn-secondary mt-4" onClick={() => { setQuery(""); setCategory("all"); }}>Clear filters</button>}</div> :
            <div className={view === "map" ? "grid gap-4 lg:grid-cols-[1fr_320px]" : ""}>
              {view === "map" && <div className="relative min-w-0 overflow-hidden rounded-xl border border-border">
                <CampusMap markers={markers} destination={destination} userLocation={location ?? undefined} showUserLocation={tracking} onSelect={setSelectedId} className="h-[430px] lg:h-[520px]" />
                {!markers.length && <p className="absolute bottom-4 left-4 right-4 z-[1000] rounded-lg bg-white p-4 text-sm shadow">These spaces do not have map coordinates yet. Their details are listed alongside.</p>}
              </div>}
              <ul className={view === "map" ? "flex max-h-[520px] flex-col gap-3 overflow-y-auto lg:pr-1" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
                {filtered.map((place) => <li key={place.id} className={`rounded-xl border bg-white p-5 transition ${selectedId === place.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-blue-300"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-[9px] font-bold uppercase tracking-widest text-primary">{place.category}</span><span className={`h-2 w-2 shrink-0 rounded-full ${place.isAvailable ? "bg-blue-500" : "bg-amber-400"}`} title={place.isAvailable ? "Open for use (booking availability varies)" : "Currently unavailable"} /></div>
                  <button type="button" className="mt-3 text-left text-base font-semibold text-[var(--brand-ink)] hover:text-primary" onClick={() => setSelectedId(place.id)}>{place.name}</button>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={12} />{place.building}{place.code && ` / ${place.code}`}</p>
                  {place.capacity > 0 && <p className="mt-2 text-xs text-slate-500">Capacity: {place.capacity} people</p>}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    {place.lat !== null ? <Link href={`/navigation?id=${encodeURIComponent(place.id)}`} className="flex items-center gap-2 text-xs font-semibold text-primary">Get directions <ArrowUpRight size={14} /></Link> : <span className="text-xs text-slate-400">Map location not yet listed</span>}
                    <Link href={`/bookings?room=${encodeURIComponent(place.id)}`} className="text-xs font-semibold text-slate-600">View bookings</Link>
                  </div>
                </li>)}
              </ul>
            </div>}
        </>}
      </section>

      <section className="border-y border-border bg-[var(--brand-soft)]"><div className="campus-container py-12 sm:py-16">
        <p className="campus-eyebrow text-slate-500">02 / CAMPUS LIFE, SIMPLIFIED</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><h2 className="text-3xl font-semibold tracking-tight text-[var(--brand-ink)]">More than getting from A to B.</h2><span className="text-sm text-slate-500">Everything you need for the day ahead.</span></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map(({ icon: Icon, title, copy, href, label }) => <Link key={href} href={href} className="group flex flex-col rounded-xl border border-blue-100 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"><Icon size={25} strokeWidth={1.5} className="text-primary" /><h3 className="mt-7 text-lg font-semibold text-[var(--brand-ink)]">{title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{copy}</p><span className="mt-7 flex items-center justify-between text-xs font-semibold text-primary">{label}<ArrowUpRight size={17} /></span></Link>)}</div>
      </div></section>

      <section className="campus-container py-12 sm:py-16">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="campus-eyebrow text-slate-500">03 / IN THE KNOW</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-ink)]">Around campus.</h2></div><Megaphone size={28} strokeWidth={1.4} className="text-primary" /></div>
        {status !== "authenticated" ? <div className="mt-7 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-border bg-white p-7"><div><h3 className="font-semibold">Your university. Your updates.</h3><p className="mt-2 text-sm text-slate-500">Sign in to see campus announcements and plan your week.</p></div><Link href="/login" className="ui-btn ui-btn-primary">Student sign in <ArrowRight size={16} /></Link></div> : announcementError ? <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{announcementError} <Link href="/timetable" className="underline">Open campus updates</Link></p> : announcementsLoading ? <p role="status" className="mt-6 text-sm text-slate-500">Loading campus updates...</p> : announcements.length ? <div className="mt-7 grid gap-4 md:grid-cols-3">{announcements.slice(0, 3).map((item) => <article key={item._id} className="rounded-xl border border-border bg-white p-6"><p className={`text-[10px] font-semibold uppercase tracking-widest ${item.priority === "urgent" ? "text-red-600" : "text-primary"}`}>{item.priority} / {new Date(item.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}</p><h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500">{item.message}</p></article>)}</div> : <p className="mt-7 rounded-xl border border-border bg-white p-7 text-sm text-slate-500">You are all caught up{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}. New campus announcements will appear here.</p>}
      </section>
    </div>
  );
}
