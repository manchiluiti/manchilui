import Link from "next/link";
import { kwacha, managementPage } from "@/lib/admin";

type Pay = { id: string; kind: "Tuition" | "Graduation"; receipt: string; amount: number; method: string; reference: string | null; paid_on: string; student_id: string; name: string; no: string; session: string };
type Week = { start: string; end: string; total: number; grad: number; pays: Pay[] };

// Weeks run Monday to Sunday. Dates are plain YYYY-MM-DD, so work in UTC to avoid timezone drift.
const weekStart = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  const day = (t.getUTCDay() + 6) % 7; // Monday = 0
  t.setUTCDate(t.getUTCDate() - day);
  return t.toISOString().slice(0, 10);
};
const addDays = (d: string, n: number) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const nice = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function Payments({ searchParams }: { searchParams: Promise<{ intake?: string; type?: string }> }) {
  const { intake = "", type: rawType = "" } = await searchParams;
  const type = rawType === "tuition" || rawType === "graduation" ? rawType : "";
  const { supabase } = await managementPage();
  const [{ data, error }, { data: grads, error: gErr }, { data: st }] = await Promise.all([
    supabase
      .from("payments")
      .select("id,amount,method,reference,paid_on,student_id,students(full_name,student_no,session)")
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range(0, 9999),
    // Graduation fees live on the student record, separate from tuition, so they never touch Fees outstanding.
    supabase.from("students").select("id,full_name,student_no,session,graduation_paid_on,graduation_amount").not("graduation_paid_on", "is", null).range(0, 9999),
    supabase.from("app_settings").select("graduation_fee").maybeSingle(),
  ]);
  const gradFee = Number(st?.graduation_fee ?? 800);

  const all: Pay[] = (data ?? []).map((p) => {
    const s = p.students as unknown as { full_name: string; student_no: string; session: string } | null;
    return { id: p.id, kind: "Tuition" as const, receipt: `/admin/receipt/${p.id}`, amount: Number(p.amount), method: p.method, reference: p.reference, paid_on: p.paid_on, student_id: p.student_id, name: s?.full_name ?? "Student", no: s?.student_no ?? "", session: s?.session ?? "" };
  });
  (grads ?? []).forEach((g) => all.push({
    id: `grad-${g.id}`, kind: "Graduation", receipt: `/admin/students/${g.id}/graduation-receipt`,
    amount: Number(g.graduation_amount ?? gradFee), method: "–", reference: null,
    paid_on: g.graduation_paid_on as string, student_id: g.id, name: g.full_name, no: g.student_no, session: g.session,
  }));
  all.sort((a, b) => b.paid_on.localeCompare(a.paid_on));
  const intakes = [...new Set(all.map((p) => p.session).filter(Boolean))].sort();
  const pays = all.filter((p) => (!intake || p.session === intake) && (!type || p.kind.toLowerCase() === type));
  const qs = (o: { intake?: string; type?: string }) => {
    const u = new URLSearchParams();
    const i = o.intake ?? intake, t = o.type ?? type;
    if (i) u.set("intake", i);
    if (t) u.set("type", t);
    const str = u.toString();
    return `/admin/payments${str ? `?${str}` : ""}`;
  };

  const map = new Map<string, Week>();
  pays.forEach((p) => {
    const start = weekStart(p.paid_on);
    const w = map.get(start) ?? { start, end: addDays(start, 6), total: 0, grad: 0, pays: [] as Pay[] };
    w.total += p.amount;
    if (p.kind === "Graduation") w.grad += p.amount;
    w.pays.push(p);
    map.set(start, w);
  });
  const weeks = [...map.values()].sort((a, b) => b.start.localeCompare(a.start));
  const tuitionTotal = pays.filter((p) => p.kind === "Tuition").reduce((t, p) => t + p.amount, 0);
  const tuitionCount = pays.filter((p) => p.kind === "Tuition").length;
  const gradTotal = pays.filter((p) => p.kind === "Graduation").reduce((t, p) => t + p.amount, 0);
  const gradCount = pays.length - tuitionCount;
  // Lusaka is UTC+2.
  const today = new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
  const thisWeek = map.get(weekStart(today));

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin">Dashboard</Link> / Payments</p><h1>Payment history</h1></div>
      </div>

      {(error || gErr) && <div className="err" style={{ marginBottom: 16 }}>{(error ?? gErr)?.message}</div>}

      <nav className="seg" aria-label="Payment type">
        {([["", "All payments"], ["tuition", "Tuition"], ["graduation", "Graduation"]] as const).map(([t, label]) => (
          <Link key={t} href={qs({ type: t })} className={type === t ? "on" : ""}>{label}</Link>
        ))}
      </nav>

      {intakes.length > 1 && (
        <nav className="seg" aria-label="Intake">
          <Link href={qs({ intake: "" })} className={!intake ? "on" : ""}>All intakes</Link>
          {intakes.map((i) => <Link key={i} href={qs({ intake: i })} className={intake === i ? "on" : ""}>{i}</Link>)}
        </nav>
      )}

      <div className="tiles" style={{ marginBottom: 24, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <div className="tile"><div className="k">This week</div><div className="v">{kwacha(thisWeek?.total ?? 0)}</div><div className="s">{thisWeek?.pays.length ?? 0} payment{thisWeek?.pays.length === 1 ? "" : "s"}</div></div>
        <div className="tile"><div className="k">Last week</div><div className="v">{kwacha(map.get(addDays(weekStart(today), -7))?.total ?? 0)}</div><div className="s">Monday to Sunday</div></div>
        {type !== "graduation" && <div className="tile"><div className="k">Tuition received{intake ? ` · ${intake}` : ""}</div><div className="v">{kwacha(tuitionTotal)}</div><div className="s">{tuitionCount} payment{tuitionCount === 1 ? "" : "s"}, all time</div></div>}
        {type !== "tuition" && <div className="tile"><div className="k">Graduation received{intake ? ` · ${intake}` : ""}</div><div className="v">{kwacha(gradTotal)}</div><div className="s">{gradCount} student{gradCount === 1 ? "" : "s"} paid · not part of fees outstanding</div></div>}
      </div>

      {weeks.length === 0 && <p className="muted-row">{type || intake ? "No payments match this filter." : "No payments recorded yet. Record one from a student\u0027s page."}</p>}

      {weeks.map((w, idx) => (
        <details className="rec" key={w.start} open={idx < 2} style={{ marginBottom: 16 }}>
          <summary className="rec-h" style={{ cursor: "pointer" }}>
            <div><h2 style={{ fontSize: "1.05rem" }}>Week of {nice(w.start)} – {nice(w.end)}</h2><small className="sub">{w.pays.length} payment{w.pays.length === 1 ? "" : "s"}{w.grad > 0 && w.grad < w.total ? ` · tuition ${kwacha(w.total - w.grad)}, graduation ${kwacha(w.grad)}` : ""}</small></div>
            <b style={{ fontSize: "1.2rem", color: "var(--ok)", fontVariantNumeric: "tabular-nums" }}>{kwacha(w.total)}</b>
          </summary>
          <div className="tablewrap flat">
            <table className="table">
              <thead><tr><th>Date</th><th>Student</th><th>Intake</th><th>Type</th><th>Method</th><th className="num">Amount</th><th></th></tr></thead>
              <tbody>
                {w.pays.map((p) => (
                  <tr key={p.id}>
                    <td>{nice(p.paid_on)}</td>
                    <td><Link href={`/admin/students/${p.student_id}`}><b>{p.name}</b><small className="sub">{p.no}</small></Link></td>
                    <td>{p.session}</td>
                    <td><span className={`pill ${p.kind === "Graduation" ? "wait" : "ok"}`}>{p.kind}</span></td>
                    <td>{p.method}{p.reference ? <small className="sub">{p.reference}</small> : null}</td>
                    <td className="num" style={{ color: "var(--ok)" }}>{kwacha(p.amount)}</td>
                    <td><Link className="copy" href={p.receipt}>Receipt</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </>
  );
}
