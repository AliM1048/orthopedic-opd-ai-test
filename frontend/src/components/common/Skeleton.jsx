// Grey shimmering placeholders shown while data loads, shaped like the
// content they stand in for so the layout doesn't jump when it arrives.
// Styles: .skeleton in index.css.

export function Skeleton({ width = '100%', height = 12, circle = false, style }) {
  return (
    <span
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: circle ? '50%' : undefined, ...style }}
    />
  );
}

// Rows for a .data-table body: an avatar + two lines in the first column,
// a single bar in each of the rest.
export function SkeletonTableRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} className="skeleton-row">
      <td>
        <div className="flex items-center gap-3">
          <Skeleton width={40} height={40} circle />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width={120 + ((r * 37) % 60)} height={12} />
            <Skeleton width={70} height={10} />
          </div>
        </div>
      </td>
      {Array.from({ length: cols - 1 }, (_, c) => (
        <td key={c}><Skeleton width={c === cols - 2 ? 72 : 60 + ((r + c) * 23) % 50} height={12} /></td>
      ))}
    </tr>
  ));
}

// Stacked avatar + text lines, for card lists that aren't tables.
export function SkeletonList({ rows = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px' }} aria-busy="true">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-3">
          <Skeleton width={36} height={36} circle />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width={`${55 + ((r * 17) % 35)}%`} height={12} />
            <Skeleton width="35%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
