import type { AuditRow } from "../lib/types";

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-[0.92rem]">
        <thead className="border-b border-line text-muted">
          <tr>
            <th className="p-2">Time</th>
            <th className="p-2">Who</th>
            <th className="p-2">Action</th>
            <th className="p-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-line align-top last:border-0">
              <td className="whitespace-nowrap p-2">{new Date(a.created_at).toLocaleString("en-IN")}</td>
              <td className="p-2 font-semibold">{a.actor}</td>
              <td className="p-2">{a.action}</td>
              <td className="p-2 font-mono text-xs text-muted">{JSON.stringify(a.detail)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
