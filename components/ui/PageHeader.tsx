import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Renders a back button when provided (use on detail pages). */
  backHref?: string;
  actions?: ReactNode;
};

/** Workspace page heading, matching the staff portal's `.page-heading` design. */
export function PageHeader({ eyebrow = 'Student workspace', title, subtitle, backHref, actions }: PageHeaderProps) {
  return (
    <header className="page-heading">
      <div>
        {backHref ? (
          <Link href={backHref} aria-label="Back" className="icon-button page-back">
            <ArrowLeft aria-hidden="true" size={17} />
          </Link>
        ) : null}
        <div className="min-w-0">
          <div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div>
          <h1>{title}<span className="heading-dot">.</span></h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="heading-actions">{actions}</div> : null}
    </header>
  );
}

export function statusTone(status: string) {
  const s = status.toLowerCase();
  if (['confirmed', 'paid', 'available', 'open', 'completed', 'approved'].includes(s)) return 'green';
  if (['pending', 'busy', 'processing', 'requested'].includes(s)) return 'amber';
  if (['failed', 'cancelled', 'rejected', 'declined'].includes(s)) return 'red';
  return 'blue';
}

export function statusBadgeClass(status: string) {
  return `status-badge ${statusTone(status)}`;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={statusBadgeClass(status)}><i />{status}</span>;
}
