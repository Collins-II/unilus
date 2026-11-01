import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import BrandLogo from "@/components/brand-logo";

export default function Footer() {
  return (
    <footer className="bg-[var(--brand-ink)] text-white">
      <div className="campus-container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div><Link href="/" aria-label="UNILUS Navigator home"><BrandLogo inverse /></Link><p className="mt-5 max-w-sm text-sm leading-7 text-white/55">Less time finding your way.<br />More time making the most of university.</p></div>
        <div><h2 className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Your campus</h2><ul className="mt-5 space-y-3 text-sm text-white/80">{[["Explore campus", "/"], ["Get directions", "/navigation"], ["Book a room", "/bookings"], ["View timetable", "/timetable"]].map(([label, href]) => <li key={href}><Link href={href} className="hover:text-blue-200">{label}</Link></li>)}</ul></div>
        <div><h2 className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Stay connected</h2><ul className="mt-5 space-y-3 text-sm text-white/80"><li><Link href="/chat">Chat & study circles</Link></li><li><Link href="/notifications">Notifications</Link></li><li><a href="https://www.unilus.ac.zm" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">University website <ArrowUpRight size={14} /></a></li></ul></div>
      </div>
      <div className="border-t border-white/10"><div className="campus-container flex flex-wrap justify-between gap-3 py-5 text-[10px] text-white/50"><span>&copy; {new Date().getFullYear()} UNILUS Navigator. Lusaka, Zambia.</span><span>Find your place. Make your mark.</span></div></div>
    </footer>
  );
}
