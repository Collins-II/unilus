"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useChatUnread } from '@/lib/ChatUnreadContext';
import { CalendarDays, House, MessageSquare, Navigation } from 'lucide-react';

export function MobileNav({ className = "lg:hidden" }: { className?: string }) {
  const { status } = useSession();
  const { unread } = useChatUnread();
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home', icon: House },
    { href: '/navigation', label: 'Navigate', icon: Navigation },
    { href: '/bookings', label: 'Bookings', icon: CalendarDays },
    { href: '/chat', label: 'Connect', icon: MessageSquare },
  ];

  if (pathname === '/login') return null;

  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-0 bottom-0 z-[1200] border-t border-border bg-white pb-[env(safe-area-inset-bottom)] ${className}`}
    >
      <div className="grid grid-cols-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-black uppercase tracking-widest transition ${
                active ? 'text-primary shadow-[inset_0_3px_0_0_#1769c2]' : 'text-slate-500 hover:text-primary'
              }`}
            >
              <span className="relative">
                <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5]' : ''}`} />
                {href === '/chat' && status === 'authenticated' && unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}