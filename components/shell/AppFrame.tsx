"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Navigation,
  ShoppingBag,
} from "lucide-react";

import BrandLogo from "@/components/brand-logo";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import { MobileNav } from "@/components/MobileNav";
import { useChatUnread } from "@/lib/ChatUnreadContext";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Navigate", href: "/navigation", icon: Navigation },
  { label: "Room bookings", href: "/bookings", icon: CalendarDays },
  { label: "Timetable", href: "/timetable", icon: CalendarClock },
  { label: "Study circles", href: "/chat", icon: MessagesSquare },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Campus services", href: "/commerce", icon: ShoppingBag },
];

const extraTitles: Record<string, string> = { "/booking/": "Booking details" };

/** Pages that always render the public website chrome. `/login` renders bare and `/navigation` only uses the workspace when signed in. */
const PUBLIC_CHROME = new Set(["/", "/contact"]);

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ST";
}

function useUnreadNotifications() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return;
      const response = await fetch("/api/notifications/unread", { cache: "no-store" }).catch(() => null);
      const data = response?.ok ? await response.json().catch(() => null) : null;
      if (!cancelled && typeof data?.unreadCount === "number") setCount(data.unreadCount);
    };
    void load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return count;
}

function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col pb-20 lg:pb-0">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <div id="main-content" className="flex-1">{children}</div>
      <Footer />
      <MobileNav />
    </div>
  );
}

function StudentWorkspace({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { data: session } = useSession();
  const { unread: chatUnread } = useChatUnread();
  const notificationsUnread = useUnreadNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the mobile drawer whenever the route changes.
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setMobileOpen(false);
  }

  const name = session?.user?.name || "Student";
  const studentId = session?.user?.studentId || "";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = navigation.find((item) => isActive(item.href));
  const pageTitle = current?.label ?? Object.entries(extraTitles).find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Workspace";
  const badges: Record<string, number> = { "/chat": chatUnread, "/notifications": notificationsUnread };

  return (
    <div className="student-app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {mobileOpen && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Student workspace">
        <Link href="/dashboard" className="app-brand" aria-label="UNILUS Navigator dashboard"><BrandLogo /></Link>
        <a href="https://www.unilus.ac.zm" target="_blank" rel="noopener noreferrer" className="workspace-switch">
          <span className="workspace-avatar">U</span>
          <span><strong>University of Lusaka</strong><small><i /> Student portal</small></span>
          <ArrowUpRight size={15} />
        </a>
        <div className="nav-label">STUDENT WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            const badge = badges[href] ?? 0;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`app-nav-item ${active ? "active" : ""}`}>
                <Icon size={19} />
                <span>{label}</span>
                {badge > 0 && <b aria-label={`${badge} unread`}>{badge > 99 ? "99+" : badge}</b>}
                {active && badge === 0 && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="app-nav-item"><Compass size={19} /><span>Explore campus</span></Link>
          <div className="sidebar-profile">
            <span className="person-avatar dark-avatar">{initials(name)}</span>
            <span><strong>{name}</strong><small>{studentId ? `Student · ${studentId}` : "Student"}</small></span>
            <button type="button" className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => void signOut({ callbackUrl: "/login" })}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-breadcrumb">
            <button type="button" className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
            <span className="breadcrumb-root">Student workspace</span>
            <ChevronRight size={14} />
            <strong>{pageTitle}</strong>
          </div>
          <div className="topbar-actions">
            <Link href="/notifications" className="icon-button" aria-label={notificationsUnread ? `Notifications, ${notificationsUnread} unread` : "Notifications"}>
              <Bell size={19} />
              {notificationsUnread > 0 && <i>{notificationsUnread > 9 ? "9+" : notificationsUnread}</i>}
            </Link>
            <span className="topbar-divider" />
            <Link href="/dashboard" className="person-avatar header-avatar" aria-label="My dashboard" title={session?.user?.email ?? name}>{initials(name)}</Link>
          </div>
        </header>
        <main id="main-content" className="app-main">{children}</main>
        <footer className="app-footer">
          <span>&copy; {new Date().getFullYear()} University of Lusaka · UNILUS Navigator</span>
          <span><i /> Signed in as {studentId || name}</span>
        </footer>
      </div>
    </div>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { status } = useSession();
  if (pathname === "/login") return <>{children}</>;
  const publicChrome = PUBLIC_CHROME.has(pathname) || (pathname === "/navigation" && status !== "authenticated");

  if (publicChrome) return <PublicFrame>{children}</PublicFrame>;
  return <StudentWorkspace pathname={pathname}>{children}</StudentWorkspace>;
}
