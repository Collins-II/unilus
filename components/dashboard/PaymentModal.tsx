"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CreditCard, ShieldCheck, X } from "lucide-react";

type PaymentInfo = {
  paymentMethod: "card" | "mobile-money" | "bank-transfer";
  provider: string;
  billingEmail: string;
  cardholderName: string;
  last4: string;
  status: "verified" | "pending" | "inactive";
};

type PaymentModalProps = {
  open: boolean;
  payment: PaymentInfo | null;
  onClose: () => void;
  onSaved: () => void;
};

const paymentMethods: { value: PaymentInfo["paymentMethod"]; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "mobile-money", label: "Mobile money" },
  { value: "bank-transfer", label: "Bank transfer" },
];

function paymentForm(payment: PaymentInfo | null): PaymentInfo {
  return {
    paymentMethod: payment?.paymentMethod || "card",
    provider: payment?.provider || "Visa",
    billingEmail: payment?.billingEmail || "",
    cardholderName: payment?.cardholderName || "",
    last4: payment?.last4 || "",
    status: payment?.status || "verified",
  };
}

export function PaymentModal({ open, payment, onClose, onSaved }: PaymentModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<PaymentInfo>(() => paymentForm(payment));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(paymentForm(payment));
      setError("");
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
    }
  }, [open, payment]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: form.paymentMethod,
          provider: form.provider,
          billingEmail: form.billingEmail,
          cardholderName: form.cardholderName,
          last4: form.last4,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save payment details.");
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save payment details.");
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
      aria-labelledby="payment-modal-title"
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      {open && <div className="p-5 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1769c2]">Payment</p>
            <h2 id="payment-modal-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Billing details</h2>
            <p className="mt-2 text-sm text-slate-500">Manage the payment method associated with your account.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close payment details" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><CreditCard aria-hidden="true" className="h-4 w-4 text-slate-400" />Payment method</span>
              <select
                value={form.paymentMethod}
                disabled={isSubmitting}
                onChange={(event) => {
                  const method = paymentMethods.find(({ value }) => value === event.target.value)?.value;
                  if (method) setForm((current) => ({
                    ...current,
                    paymentMethod: method,
                    provider: method === current.paymentMethod ? current.provider : "",
                    ...(method === "card" ? {} : { cardholderName: "", last4: "" }),
                  }));
                }}
                className="ui-input"
              >
                {paymentMethods.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-slate-400" />{form.paymentMethod === "card" ? "Card provider" : form.paymentMethod === "mobile-money" ? "Mobile money provider" : "Bank"}</span>
              <input
                value={form.provider}
                onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
                className="ui-input"
                placeholder={form.paymentMethod === "card" ? "Visa, Mastercard" : form.paymentMethod === "mobile-money" ? "Airtel Money, MTN MoMo" : "Bank name"}
                required
                disabled={isSubmitting}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><CreditCard aria-hidden="true" className="h-4 w-4 text-slate-400" />Billing email</span>
            <input type="email" autoComplete="email" value={form.billingEmail} onChange={(event) => setForm((current) => ({ ...current, billingEmail: event.target.value }))} className="ui-input" placeholder="billing@campus.example" disabled={isSubmitting} />
          </label>

          {form.paymentMethod === "card" && <>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-slate-400" />Cardholder name</span>
              <input autoComplete="cc-name" value={form.cardholderName} onChange={(event) => setForm((current) => ({ ...current, cardholderName: event.target.value }))} className="ui-input" placeholder="Name on card" disabled={isSubmitting} />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><CreditCard aria-hidden="true" className="h-4 w-4 text-slate-400" />Last 4 digits</span>
              <input
                inputMode="numeric"
                autoComplete="cc-number"
                value={form.last4}
                maxLength={4}
                onChange={(event) => setForm((current) => ({ ...current, last4: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                className="ui-input"
                placeholder="1234"
                disabled={isSubmitting}
              />
              <span className="mt-1 block text-xs text-slate-500">Only the last four digits are requested. Never enter your full card number.</span>
            </label>
          </>}

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="ui-btn ui-btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="ui-btn ui-btn-primary">{isSubmitting ? "Saving..." : "Save payment"}</button>
          </div>
        </form>
      </div>}
    </dialog>
  );
}
