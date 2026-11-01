import Link from 'next/link';
import { ArrowUpRight, DoorOpen } from 'lucide-react';

import { StatusBadge } from '@/components/ui/PageHeader';

type RoomOption = {
  id: string;
  name: string;
  code: string;
  floor: string;
  capacity: number;
  isAvailable?: boolean;
  description?: string;
};

type AvailableRoomsPanelProps = {
  rooms: RoomOption[];
};

export function AvailableRoomsPanel({ rooms }: AvailableRoomsPanelProps) {
  const availableRooms = rooms.filter((room) => room.isAvailable !== false);
  const visibleRooms = availableRooms.slice(0, 4);

  return (
    <section className="app-panel flex flex-col" aria-labelledby="rooms-heading">
      <div className="panel-heading">
        <div>
          <h2 id="rooms-heading">Available rooms</h2>
          <p>{availableRooms.length} free today, 09:00 – 17:00</p>
        </div>
        <span className="stat-icon"><DoorOpen size={16} /></span>
      </div>

      {visibleRooms.length ? (
        <ul className="panel-list flex-1">
          {visibleRooms.map((room) => (
            <li key={room.id}>
              <span className="min-w-0">
                <strong>{room.name}</strong>
                <small>{[room.code, room.floor, `${room.capacity} seats`].filter(Boolean).join(' · ')}</small>
              </span>
              <StatusBadge status="available" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state flex-1">
          <DoorOpen size={26} />
          <h3>No rooms free right now</h3>
          <p>All lecture rooms are booked for today. Try another date from Room bookings.</p>
        </div>
      )}

      <Link href="/bookings" className="panel-footer">Reserve a room <ArrowUpRight size={13} /></Link>
    </section>
  );
}
