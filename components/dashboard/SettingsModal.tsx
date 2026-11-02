"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bell, Shield, SlidersHorizontal, X } from "lucide-react";

type NotificationSettings = {
  email: boolean;
  sms: boolean;
  push: boolean;
  weeklyDigest: boolean;
};

type AppSettings = {
  compactMode: boolean;
  campusAlerts: boolean;
  autoConfirmBookings: boolean;
  darkMode: boolean;
};

type SettingsState = {
  notifications: NotificationSettings;
  app: AppSettings;
};

type SettingsModalProps = {
  open: boolean;
  settings: SettingsState | null;
  onClose: () => void;
  onSaved: () => void;
};

const notificationOptions: { key: keyof NotificationSettings; label: string }[] = [
  { key: "email", label: "Email updates" },
  { key: "sms", label: "SMS reminders" },
  { key: "push", label: "Push alerts" },
  { key: "weeklyDigest", label: "Weekly digest" },
];

const appOptions: { key: keyof AppSettings; label: string }[] = [
  { key: "compactMode", label: "Compact layout" },
  { key: "campusAlerts", label: "Campus alerts" },
  { key: "autoConfirmBookings", label: "Auto-confirm bookings" },
  { key: "darkMode", label: "Dark mode" },
];

function settingsForm(settings: SettingsState | null): SettingsState {
  return {
    notifications: {
      email: true, sms: false, push: true, weeklyDigest: true,
      ...settings?.notifications,
    },
    app: {
      compactMode: false, campusAlerts: true, autoConfirmBookings: false, darkMode: true,
      ...settings?.app,
    },
  };
}

export function SettingsModal({ open, settings, onClose, onSaved }: SettingsModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<SettingsState>(() => settingsForm(settings));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(settingsForm(settings));
      setError("");
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
    }
  }, [open, settings]);

  const toggleNotification = (key: keyof NotificationSettings) => {
    setForm((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: !current.notifications[key] },
    }));
  };

  const toggleAppSetting = (key: keyof AppSettings) => {
    setForm((current) => ({
      ...current,
      app: { ...current.app, [key]: !current.app[key] },
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save settings.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (!isSubmitting) onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
      aria-labelledby="settings-modal-title"
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      {open && <div className="p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1769c2]">Settings</p>
            <h2 id="settings-modal-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Account preferences</h2>
            <p className="mt-2 text-sm text-slate-500">Choose how you receive updates and use the app.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section aria-labelledby="notification-settings-title">
            <h3 id="notification-settings-title" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Bell aria-hidden="true" className="h-4 w-4 text-[#1769c2]" />Notifications</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {notificationOptions.map(({ key, label }) => {
                const enabled = form.notifications[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={isSubmitting}
                    onClick={() => toggleNotification(key)}
                    className={`flex min-h-[56px] items-center justify-between gap-4 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769c2] disabled:cursor-not-allowed disabled:opacity-60 ${
                      enabled ? "border-[#c7d9ee] bg-[#f4f8fd] text-slate-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    <span aria-hidden="true" className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${enabled ? "bg-[#1769c2]" : "bg-slate-300"}`}>
                      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="app-settings-title">
            <h3 id="app-settings-title" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-[#1769c2]" />Interface and campus</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {appOptions.map(({ key, label }) => {
                const enabled = form.app[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={isSubmitting}
                    onClick={() => toggleAppSetting(key)}
                    className={`flex min-h-[56px] items-center justify-between gap-4 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769c2] disabled:cursor-not-allowed disabled:opacity-60 ${
                      enabled ? "border-[#c7d9ee] bg-[#f4f8fd] text-slate-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    <span aria-hidden="true" className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${enabled ? "bg-[#1769c2]" : "bg-slate-300"}`}>
                      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Shield aria-hidden="true" className="h-4 w-4 text-[#1769c2]" />Security</h3>
            Two-factor authentication is managed by your identity provider and can be reviewed in the admin portal.
          </aside>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="ui-btn ui-btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="ui-btn ui-btn-primary">{isSubmitting ? "Saving..." : "Save settings"}</button>
          </div>
        </form>
      </div>}
    </dialog>
  );
}
