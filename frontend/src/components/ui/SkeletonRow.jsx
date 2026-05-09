// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ui/SkeletonRow.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function SkeletonRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j}>
          <div
            className="skeleton h-4 rounded"
            style={{ width: `${55 + ((i + j) % 4) * 12}%` }}
          />
        </td>
      ))}
    </tr>
  ))
}