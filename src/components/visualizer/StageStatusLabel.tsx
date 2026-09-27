import { Check, Circle, CircleAlert, CircleDot, CircleMinus } from 'lucide-react';
import type { StageStatus } from '../../engine/types';

const STATUS: Record<StageStatus, { label: string; icon: typeof Check; className: string }> = {
  pending: { label: 'Waiting', icon: Circle, className: 'text-muted' },
  active: { label: 'Current', icon: CircleDot, className: 'text-accent' },
  complete: { label: 'Done', icon: Check, className: 'text-success' },
  failed: { label: 'Failed', icon: CircleAlert, className: 'text-danger' },
  skipped: { label: 'Not reached', icon: CircleMinus, className: 'text-muted' },
};

/** Icon + text so status never depends on colour alone. */
export function StageStatusLabel({ status }: { status: StageStatus }) {
  const { label, icon: Icon, className } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
      <Icon size={13} aria-hidden />
      {label}
    </span>
  );
}
