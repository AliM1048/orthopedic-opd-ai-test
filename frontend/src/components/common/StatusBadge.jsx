import { STATUS_CONFIG } from '../../data/mockData';

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, class: 'badge-pending' };
  return (
    <span className={`badge ${cfg.class}`}>
      <span className="badge-dot" />
      {cfg.label}
    </span>
  );
}
