import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { kwacha, managementPage } from "@/lib/admin";
import { feeItems } from "@/lib/otherFees";
import { bulkOtherFees } from "../../../actions";

export const maxDuration = 60;

export default async function OtherFeesPage({ searchParams }: { searchParams: Promise<{ show?: string; intake?: string }> }) {
  const { show = "all", intake = "" } = await searchParams;
  const { supabase } = await managementPage();
  const items = await feeItems(supabase);
  let q = supabase.from("students").select("id,student_no,full_name,session").neq("status", "Withdrawn").is("archived_at", null).order("student_no");
  if (intake) q = q.eq("session", intake);
  const [{ data: students }, { data: rows }] = await Promise.all([q, supabase.from("student_fee_items").select("student_id,item_code,balance,provided")]);
  const get = (sid: string, code: string) => (rows ?? []).find((r) => r.student_id === sid && r.item_code === code);
  const fees = items.filter((i) => i.kind === "fee");
  const reqs = items.filter((i) => i.kind === "item");
  const owesSomething = (sid: string) => fees.some((f) => Number(get(sid, f.code)?.balance ?? 0) > 0) || reqs.some((r) => get(sid, r.code)?.provided === false);
  const list = (students ?? []).filter((s) => show !== "owing" || owesSomething(s.id));
  const total = (students ?? []).reduce((t, s) => t + fees.reduce((u, f) => u + Number(get(s.id, f.code)?.balance ?? 0), 0), 0);
  const intakes = [...new Set((students ?? []).map((s) => s.session))];

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/students">Students</Link> / Other fees</p><h1>Other fees &amp; requirements</h1></div>
        <div className="tile" style={{ padding: "12px 18px" }}><div className="k">Owed in other fees</div><div className="v" style={{ fontSize: "1.4rem", color: total ? "var(--warn)" : "var(--ok)" }}>{kwacha(total)}</div></div>
      </div>
      <p className="hint" style={{ marginBottom: 14, maxWidth: 820 }}>
        Type what each student still <b>owes</b> (0 = fully paid) and untick requirements they haven&apos;t brought, then click Save at the bottom. Fees: {fees.map((f) => `${f.name} K${f.amount}`).join(", ")}. Change amounts or add items in <Link className="copy" href="/admin/settings">Settings</Link>.
      </p>
      <nav className="seg" aria-label="Show">
        <Link href={`/admin/students/other-fees${intake ? `?intake=${encodeURIComponent(intake)}` : ""}`} className={show !== "owing" ? "on" : ""}>Everyone</Link>
        <Link href={`/admin/students/other-fees?show=owing${intake ? `&intake=${encodeURIComponent(intake)}` : ""}`} className={show === "owing" ? "on" : ""}>Owing or missing items</Link>
      </nav>
      {intakes.length > 1 && !intake && <p className="hint" style={{ marginBottom: 12 }}>Intake: {intakes.map((i, n) => <span key={i}>{n ? " · " : ""}<Link className="copy" href={`/admin/students/other-fees?intake=${encodeURIComponent(i)}`}>{i}</Link></span>)}</p>}
      {intake && <p className="hint" style={{ marginBottom: 12 }}>Showing {intake} · <Link className="copy" href="/admin/students/other-fees">All intakes</Link></p>}

      <ActionForm action={bulkOtherFees} submit="Save all" variant="orange">
        <div className="atable" style={{ overflowX: "auto" }}>
          <table className="mini" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Student</th>
                {fees.map((f) => <th key={f.code} className="num">{f.name}<br /><span style={{ textTransform: "none", letterSpacing: 0 }}>owes (K{f.amount})</span></th>)}
                {reqs.map((r) => <th key={r.code} style={{ textAlign: "center" }}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className={owesSomething(s.id) ? "owing" : ""}>
                  <td><input type="hidden" name="sid" value={s.id} /><Link href={`/admin/students/${s.id}`} className="copy">{s.full_name}</Link><br /><small className="sub">{s.student_no}</small></td>
                  {fees.map((f) => (
                    <td key={f.code} className="num"><input className="mini-input" name={`${s.id}:bal_${f.code}`} inputMode="decimal" defaultValue={String(Number(get(s.id, f.code)?.balance ?? 0))} aria-label={`${s.full_name} ${f.name} owed`} /></td>
                  ))}
                  {reqs.map((r) => (
                    <td key={r.code} style={{ textAlign: "center" }}><input type="checkbox" name={`${s.id}:has_${r.code}`} defaultChecked={get(s.id, r.code)?.provided ?? true} aria-label={`${s.full_name} brought ${r.name}`} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted-row" style={{ padding: 16 }}>{show === "owing" ? "Nobody owes other fees or is missing items." : "No current students."}</p>}
        </div>
      </ActionForm>
    </>
  );
}
