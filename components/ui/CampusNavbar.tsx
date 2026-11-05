'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import BrandLogo from '@/components/brand-logo';
import { NotificationBell } from '@/components/notifications';
import { useNotifications } from '@/lib/useNotifications';

function NavbarNotifications() {
  const { unreadCount } = useNotifications();
  return (
    <div className="rounded-full bg-white shadow-lg shadow-black/10">
      <NotificationBell unreadCount={unreadCount} />
    </div>
  );
}

export function CampusNavbar() {
  const { status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isAuthenticated = status === 'authenticated';
  const links = [
    { href: '/navigation', label: 'Navigate' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/timetable', label: 'Timetable' },
    { href: '/assessments', label: 'Assessments' },
    { href: '/chat', label: 'Study circles' },
    { href: '/commerce', label: 'Services' },
    ...(isAuthenticated ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
  ];

  return (
    <div
      className="pointer-events-auto relative flex min-w-0 items-center justify-between gap-2 sm:gap-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      <Link
        href="/"
        aria-label="UNILUS Navigator home"
        className="flex h-11 shrink-0 items-center rounded-xl border border-emerald-100 bg-white/95 p-1 shadow-lg shadow-black/10 backdrop-blur-md sm:h-auto sm:p-2.5"
      >
        <BrandLogo compactOnMobile className="gap-2 [&>span:first-child]:h-9 [&>span:first-child]:w-9 [&>span:last-child>span:first-child]:text-sm [&>span:last-child>span:last-child]:text-[8px]" />
      </Link>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <nav aria-label="Campus navigation" className="hidden items-center gap-1 rounded-full bg-white p-1 shadow-lg shadow-black/10 xl:flex">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-medium text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 ${pathname === href ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-gray-100'}`}>
              {label}
            </Link>
          ))}
        </nav>
        {isAuthenticated && <NavbarNotifications />}
        {isAuthenticated ? (
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} aria-label="Log out" className="hidden h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 xl:flex">
            <LogOut aria-hidden="true" className="h-4 w-4" /> Log out
          </button>
        ) : status === 'unauthenticated' && pathname !== '/login' ? (
          <Link href="/login" className="flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:px-5">
            <LogIn aria-hidden="true" className="h-4 w-4" /> Log in
          </Link>
        ) : null}
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="home-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-emerald-800 shadow-lg shadow-black/10 xl:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <nav id="home-navigation" aria-label="More campus navigation" className="absolute inset-x-0 top-full mt-3 max-h-[60dvh] overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-2 shadow-xl xl:hidden">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={pathname === href ? 'page' : undefined} className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800">
              {label}
            </Link>
          ))}
          {isAuthenticated && (
            <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
