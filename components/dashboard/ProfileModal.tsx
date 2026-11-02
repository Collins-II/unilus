"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Mail, Phone, User, X } from "lucide-react";

type Profile = {
  id?: string;
  name: string;
  email: string;
  studentId: string;
  phone?: string;
  department?: string;
  program?: string;
  year?: string;
};

type ProfileModalProps = {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
};

function profileForm(profile: Profile | null): Profile {
  return {
    id: profile?.id,
    name: profile?.name || "",
    email: profile?.email || "",
    studentId: profile?.studentId || "",
    phone: profile?.phone || "",
    department: profile?.department || "",
    program: profile?.program || "",
    year: profile?.year || "",
  };
}

export function ProfileModal({ open, profile, onClose, onSaved }: ProfileModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<Profile>(() => profileForm(profile));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }

    setForm(profileForm(profile));
    setError("");
    setIsLoadingProfile(true);
    if (!dialog.current?.open) dialog.current?.showModal();

    const controller = new AbortController();
    void fetch("/api/dashboard/profile", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result: { profile?: Profile; error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load your current profile.");
        if (!result.profile) throw new Error("Your current profile could not be loaded.");
        if (!controller.signal.aborted) setForm(profileForm(result.profile));
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your current profile.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingProfile(false);
      });

    return () => controller.abort();
  }, [open, profile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          department: form.department,
          program: form.program,
          year: form.year,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to update profile.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update profile.");
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
      aria-labelledby="profile-modal-title"
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      {open && <div className="p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1769c2]">Profile</p>
            <h2 id="profile-modal-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Edit student profile</h2>
            <p className="mt-2 text-sm text-slate-500">Keep your contact and study details up to date.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close profile editor" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><User aria-hidden="true" className="h-4 w-4 text-slate-400" />Full name</span>
            <input autoComplete="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="ui-input" required disabled={isSubmitting || isLoadingProfile} />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Mail aria-hidden="true" className="h-4 w-4 text-slate-400" />Email</span>
            <input type="email" autoComplete="email" value={form.email} disabled className="ui-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500" />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><User aria-hidden="true" className="h-4 w-4 text-slate-400" />Student ID</span>
            <input value={form.studentId} disabled className="ui-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500" />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Phone aria-hidden="true" className="h-4 w-4 text-slate-400" />Phone</span>
            <input type="tel" autoComplete="tel" value={form.phone || ""} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="ui-input" placeholder="+260 971 234 567" disabled={isSubmitting || isLoadingProfile} />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><User aria-hidden="true" className="h-4 w-4 text-slate-400" />Department</span>
            <input autoComplete="organization-title" value={form.department || ""} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className="ui-input" disabled={isSubmitting || isLoadingProfile} />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><User aria-hidden="true" className="h-4 w-4 text-slate-400" />Program</span>
            <input value={form.program || ""} onChange={(event) => setForm((current) => ({ ...current, program: event.target.value }))} className="ui-input" disabled={isSubmitting || isLoadingProfile} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><User aria-hidden="true" className="h-4 w-4 text-slate-400" />Year</span>
            <input inputMode="numeric" value={form.year || ""} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} className="ui-input" placeholder="2026" disabled={isSubmitting || isLoadingProfile} />
          </label>

          {isLoadingProfile && <p role="status" className="sm:col-span-2 text-sm text-slate-500">Loading your current profile…</p>}
          {error && <div role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

          <div className="sm:col-span-2 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="ui-btn ui-btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || isLoadingProfile} className="ui-btn ui-btn-primary">{isSubmitting ? "Saving..." : isLoadingProfile ? "Loading profile..." : "Save profile"}</button>
          </div>
        </form>
      </div>}
    </dialog>
  );
}
