import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLang } from "../../lib/lang";
import { fmtDate } from "../../lib/motion";
import type { Stats } from "../../lib/types";
import { Card } from "../../components/ui";

// Flat fills from the design tokens. No gradients, no shadows.
const PRIMARY = "var(--primary)";
const INK = "var(--ink)";
const ATTENTION = "var(--attention)";
const LINE = "var(--line)";
const AXIS = { fontSize: 12, fill: "var(--muted)" };
const TIP = { contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 3 }, cursor: { fill: "var(--line)", opacity: 0.4 } };

function Block({ title, children, table }: { title: string; children: React.ReactNode; table: React.ReactNode }) {
  return (
    <Card as="section" className="space-y-3 p-4" aria-label={title}>
      <h3 className="text-xl">{title}</h3>
      <div className="h-64" role="img" aria-label={title}>{children}</div>
      <div className="max-h-44 overflow-auto rounded-sm border border-line">{table}</div>
    </Card>
  );
}

const Table = ({ head, rows }: { head: string[]; rows: (string | number)[][] }) => (
  <table className="w-full text-left text-sm">
    <thead className="sticky top-0 bg-bg"><tr>{head.map((h) => <th key={h} className="px-2 py-1 font-semibold">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="px-2 py-1 tnum">{c}</td>)}</tr>)}</tbody>
  </table>
);

export default function Charts({ s }: { s: Stats }) {
  const { t } = useLang();
  const day = (d: string) => fmtDate(d, { day: "numeric", month: "short" });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title={t("chartPerDay")} table={<Table head={[t("date"), t("opened"), t("cleared")]} rows={s.reviews_per_day.map((d) => [day(d.date), d.opened, d.cleared])} />}>
        <ResponsiveContainer>
          <LineChart data={s.reviews_per_day} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="date" tickFormatter={day} tick={AXIS} interval="preserveStartEnd" minTickGap={28} stroke={LINE} />
            <YAxis allowDecimals={false} tick={AXIS} stroke={LINE} />
            <Tooltip {...TIP} labelFormatter={(d) => day(String(d))} />
            <Legend />
            <Line type="linear" dataKey="opened" name={t("opened")} stroke={ATTENTION} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="linear" dataKey="cleared" name={t("cleared")} stroke={PRIMARY} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Block>

      <Block title={t("chartPerDoctor")} table={<Table head={[t("doctor"), t("open"), t("cleared")]} rows={s.load_per_doctor.map((d) => [d.doctor, d.open, d.cleared])} />}>
        <ResponsiveContainer>
          <BarChart data={s.load_per_doctor} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={LINE} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={AXIS} stroke={LINE} />
            <YAxis type="category" dataKey="doctor" width={120} tick={AXIS} stroke={LINE} />
            <Tooltip {...TIP} />
            <Legend />
            <Bar dataKey="open" name={t("open")} fill={ATTENTION} isAnimationActive={false} />
            <Bar dataKey="cleared" name={t("cleared")} fill={PRIMARY} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Block>

      <Block title={t("chartReasons")} table={<Table head={[t("reason"), t("count")]} rows={s.reasons.map((r) => [r.reason, r.count])} />}>
        <ResponsiveContainer>
          <BarChart data={s.reasons} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={LINE} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={AXIS} stroke={LINE} />
            <YAxis type="category" dataKey="reason" width={130} tick={AXIS} stroke={LINE} />
            <Tooltip {...TIP} />
            <Bar dataKey="count" name={t("count")} fill={INK} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Block>

      <Block title={t("chartDepartments")} table={<Table head={[t("department"), t("rate"), t("done"), t("due"), t("overdue")]} rows={s.completion_by_department.map((d) => [d.department, `${d.rate}%`, d.completed, d.due, d.overdue])} />}>
        <ResponsiveContainer>
          <BarChart data={s.completion_by_department} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={LINE} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={AXIS} stroke={LINE} />
            <YAxis type="category" dataKey="department" width={120} tick={AXIS} stroke={LINE} />
            <Tooltip {...TIP} formatter={(v) => `${v}%`} />
            <Bar dataKey="rate" name={t("rate")} fill={PRIMARY} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Block>
    </div>
  );
}
