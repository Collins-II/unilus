'use client';

import { useState, useEffect } from 'react';
import { Trash2, Check, CheckCheck, CheckCircle, AlertCircle, BellOff, Clock, DoorOpen, DollarSign, LoaderCircle, MessageSquare, Megaphone, Settings2, Wrench } from 'lucide-react';
import { useNotifications } from '@/lib/useNotifications';
import { formatNotificationTime, notificationIconMap, notificationColorMap } from '@/lib/notifications';
import type { NotificationResponse } from '@/lib/notifications';
import { NotificationPreferencesModal } from '@/components/notifications/NotificationPreferencesModal';
import { PageHeader } from '@/components/ui/PageHeader';

const iconComponents: Record<string, React.ReactNode> = {
  CheckCircle: <CheckCircle className="h-4 w-4" />,
  XCircle: <AlertCircle className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  DoorOpen: <DoorOpen className="h-4 w-4" />,
  DollarSign: <DollarSign className="h-4 w-4" />,
  AlertCircle: <AlertCircle className="h-4 w-4" />,
  MessageSquare: <MessageSquare className="h-4 w-4" />,
  Megaphone: <Megaphone className="h-4 w-4" />,
  Wrench: <Wrench className="h-4 w-4" />,
};

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    fetchNotifications(filter);
  }, [filter, fetchNotifications]);

  const filteredNotifications = notifications
    .filter((n) => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'read') return n.isRead;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const tabs = [
    { value: 'all' as const, label: 'All', count: notifications.length },
    { value: 'unread' as const, label: 'Unread', count: unreadCount },
    { value: 'read' as const, label: 'Read', count: notifications.filter((n) => n.isRead).length },
  ];

  return (
    <div className="portal-content">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'} from bookings, payments and study circles.` : 'You are all caught up.'}
        actions={
          <>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllAsRead} className="secondary-button"><CheckCheck size={15} /> Mark all read</button>
            )}
            <button type="button" onClick={() => setPreferencesOpen(true)} className="primary-button"><Settings2 size={15} /> Preferences</button>
          </>
        }
      />

      <section className="app-panel" aria-label="Notifications">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4">
          <div className="filter-tabs !mb-0 !border-b-0" role="tablist" aria-label="Filter notifications">
            {tabs.map((tab) => (
              <button type="button" role="tab" key={tab.value} aria-selected={filter === tab.value} onClick={() => setFilter(tab.value)} className={filter === tab.value ? 'active' : ''}>
                {tab.label}<span>{tab.count}</span>
              </button>
            ))}
          </div>
          <label className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            Sort
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="rounded-md border border-[#d7dfe7] bg-[#f9fbfc] px-2 py-1.5 text-xs text-[#41566c] focus:border-[#8499ad] focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>

        {error ? (
          <div role="alert" className="form-error mx-5 mt-4 flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={() => void fetchNotifications(filter)} className="small-button">Retry</button>
          </div>
        ) : null}

        {loading ? (
          <div className="empty-state" aria-busy="true">
            <LoaderCircle size={26} className="spin" />
            <h3>Loading notifications</h3>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state border-t border-[#e1e6ed]">
            <BellOff size={26} />
            <h3>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
            <p>Booking approvals, payment receipts and study circle updates will appear here.</p>
          </div>
        ) : (
          <ul className="border-t border-[#e1e6ed]">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onMarkAsUnread={markAsUnread}
                onDelete={deleteNotification}
              />
            ))}
          </ul>
        )}
      </section>

      <NotificationPreferencesModal
        isOpen={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </div>
  );
}
interface NotificationCardProps {
  notification: NotificationResponse;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
}: NotificationCardProps) {
  const iconName = notificationIconMap[notification.type];
  const colorClass = notificationColorMap[notification.type];

  return (
    <li className={`flex gap-4 border-b border-[#e1e6ed] px-5 py-4 last:border-b-0 ${notification.isRead ? '' : 'bg-[#f5f9fe] shadow-[inset_3px_0_0_#1769c2]'}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        {iconComponents[iconName] || <AlertCircle className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold text-[#1d2b41]">{notification.title}</h3>
            <p className="mt-0.5 break-words text-[13px] text-slate-600">{notification.message}</p>
            {notification.description && <p className="mt-1 text-xs text-slate-500">{notification.description}</p>}
          </div>
          <div className="row-actions">
            <button
              type="button"
              onClick={() => (notification.isRead ? onMarkAsUnread(notification.id) : onMarkAsRead(notification.id))}
              className="icon-button !h-8 !w-8"
              title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
              aria-label={notification.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {notification.isRead ? <AlertCircle size={15} /> : <Check size={15} />}
            </button>
            <button type="button" onClick={() => onDelete(notification.id)} className="icon-button !h-8 !w-8 hover:!text-rose-600" title="Delete" aria-label="Delete notification">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <span>{formatNotificationTime(notification.createdAt)}</span>
          {!notification.isRead && <span className="status-badge blue">New</span>}
          {notification.actionUrl && (
            <a href={notification.actionUrl} className="text-link">{notification.actionLabel || 'View details'}</a>
          )}
        </div>
      </div>
    </li>
  );
}