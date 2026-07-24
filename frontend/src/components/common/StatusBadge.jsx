import { useLookup } from '../../hooks/useLookupData';

export default function StatusBadge({ status }) {
  const { statusConfig } = useLookup();
  const cfg = statusConfig[status] || { label: status, class: 'badge-pending' };
  return (
    <span className={`badge ${cfg.class}`}>
      <span className="badge-dot" />
      {cfg.label}
    </span>
  );
}
