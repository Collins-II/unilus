"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ArrowUpRight, LogOut, Menu, X, User } from "lucide-react";
import { useState } from "react";
import BrandLogo from "@/components/brand-logo";
import { NotificationBell } from "@/components/notifications";
import { useNotifications } from "@/lib/useNotifications";


const links = [
  { label: "Explore campus", href: "/" },
  { label: "Navigate", href: "/navigation" },
  { label: "Room bookings", href: "/bookings" },
  { label: "Timetable", href: "/timetable" },
  { label: "Study circles", href: "/chat" },
];

function Notifications() {
  const { unreadCount } = useNotifications();
  return <NotificationBell unreadCount={unreadCount} />;
}

export default function Navbar() {
  const pathname = usePathname();
  const { status, data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="relative z-[1200] border-b border-border bg-white">
        <div className="border-b border-border bg-[var(--brand-soft)]">
          <div className="campus-container flex items-center justify-between gap-3 py-2 text-[10px] font-semibold text-slate-600">
            <span>UNIVERSITY OF LUSAKA <span className="mx-2 text-slate-300">/</span> YOUR CAMPUS, CONNECTED.</span>
            <span className="hidden sm:block">Lusaka, Zambia</span>
          </div>
        </div>
        
        <div className="campus-container flex h-20 items-center justify-between gap-4">
          <Link href="/" aria-label="UNILUS Navigator home"><BrandLogo /></Link>
          
          <nav aria-label="Main navigation" className="hidden items-center gap-6 xl:flex">
            {links.map(({ label, href }) => (
              <Link 
                key={href} 
                href={href} 
                aria-current={pathname === href ? "page" : undefined} 
                className={`text-xs font-semibold transition hover:text-primary ${pathname === href ? "text-primary" : "text-slate-500"}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {status === "authenticated" && <div className="hidden sm:block"><Notifications /></div>}
            
            {status === "authenticated" ? (
              <Link 
                href="/dashboard" 
                className="hidden items-center gap-2 rounded bg-[var(--brand-ink)] px-4 py-3 text-xs font-semibold text-white transition hover:bg-primary sm:inline-flex"
              >
                <span>{session?.user?.name || "My dashboard"}</span>
                <ArrowUpRight size={15} />
              </Link>
            ) : (
              <div className="hidden gap-2 sm:flex">
                <Link href="/login" className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <User size={14} />
                  Sign in
                </Link>
                <Link href="/login?mode=register" className="inline-flex items-center gap-2 rounded bg-[var(--brand-ink)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary"
                >
                  Register
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            )}

            <button 
              type="button" 
              aria-label={menuOpen ? "Close menu" : "Open menu"} 
              aria-expanded={menuOpen} 
              aria-controls="campus-menu" 
              onClick={() => setMenuOpen(!menuOpen)} 
              className="grid h-11 w-11 place-items-center rounded-lg border border-border xl:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav id="campus-menu" aria-label="More navigation" className="absolute inset-x-0 top-full border-b border-border bg-white px-6 pb-5 shadow-lg xl:hidden">
            {links.map(({ label, href }) => (
              <Link 
                key={href} 
                href={href} 
                onClick={() => setMenuOpen(false)} 
                className="flex items-center justify-between border-b border-border py-3 text-sm"
              >
                {label}
                <ArrowUpRight size={15} />
              </Link>
            ))}

            {status === "authenticated" ? (
              <>
                <Link 
                  href="/dashboard" 
                  onClick={() => setMenuOpen(false)} 
                  className="flex items-center justify-between border-b border-border py-3 text-sm font-semibold text-primary"
                >
                  My dashboard
                  <ArrowUpRight size={15} />
                </Link>
                <button 
                  type="button" 
                  className="mt-4 flex items-center gap-2 text-sm text-slate-600" 
                  onClick={() => void signOut({ callbackUrl: "/" })}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="w-full rounded border border-slate-200 py-2.5 text-center text-sm font-semibold text-slate-700"
                >
                  Student Sign in
                </Link>
                <Link href="/login?mode=register" onClick={() => setMenuOpen(false)} className="w-full rounded bg-[var(--brand-ink)] py-2.5 text-center text-sm font-semibold text-white"
                >
                  Create Student Account
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>
    </>
  );
}