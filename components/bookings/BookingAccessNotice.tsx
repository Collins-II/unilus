import { Info } from "lucide-react";
import type { BookingAccess } from "@/lib/booking-policy";

export function BookingAccessNotice({ access }: { access: BookingAccess | null }) {
  if (!access || access.allowed) return null;
  return (
    <div role="status" className="welcome-strip !mb-0">
      <div>
        <span className="welcome-icon"><Info size={18} /></span>
        <span><strong>Room booking unavailable</strong><span>{access.message}</span></span>
      </div>
      {access.adminUrl && <a href={access.adminUrl}>Open central admin</a>}
    </div>
  );
}
