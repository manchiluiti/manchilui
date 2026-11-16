import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import TableSearch from "@/components/TableSearch";
import { managementPage } from "@/lib/admin";
import { saveGraduationPayments, setGraduationFee } from "../../../actions";

type Row = { id: string; student_no: string; full_name: string; session: string; graduation_paid_on: string | null; student_accounts: { fees_balance: number; other_balance?: number } | null };

export default async function GraduationAdmin({ searchParams }: { searchParams: Promise<{ intake?: string; show?: string }> }) {
  const { intake = "", show = "all" } = await searchParams;
  const { supabase } = await managementPage();
  let q = supabase.from("students").select("id,student_no,full_name,session,graduation_paid_on,student_accounts(fees_balance,other_balance)").neq("status", "Withdrawn").is("archived_at", null).order("student_no");
  if (intake) q = q.eq("session", intake);
  const [{ data }, { data: st }] = await Promise.all([q, supabase.from("app_settings").select("graduation_fee").maybeSingle()]);
  const all = (data ?? []) as unknown as Row[];
  const fee = Number(st?.graduation_fee ?? 800);
  const list = all.filter((s) => (show === "unpaid" ? !s.graduation_paid_on : show === "paid" ? !!s.graduation_paid_on : true));
  const paidCount = all.filter((s) => s.graduation_paid_on).length;
  const intakes = [...new Set(all.map((s) => s.session))];
  const owes = (s: Row) => Number(s.student_accounts?.fees_balance ?? 0) + Number(s.student_accounts?.other_balance ?? 0);
  const qs = (o: Record<string, string>) => { const p = new URLSearchParams({ ...(intake ? { intake } : {}), ...(show !== "all" ? { show } : {}), ...o }); for (const [k, v] of [...p]) if (!v) p.delete(k); const s = p.toString(); return s ? `?${s}` : ""; };

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/students">Students</Link> / Graduation</p><h1>Graduation fee</h1></div>
        <div className="tile" style={{ padding: "12px 18px" }}><div className="k">Paid</div><div className="v" style={{ fontSize: "1.4rem" }}>{paidCount} of {all.length}</div></div>
      </div>
      <div className="grid2" style={{ gap: 20, alignItems: "start", marginBottom: 16 }}>
        <p className="hint" style={{ margin: 0 }}>Tick students who have paid the K{fee.toLocaleString()} graduation fee, set the date paid, then <b>Save</b>. They can then print a graduation receipt from the portal&apos;s Graduation page. The portal also shows whether tuition, other fees and requirements are cleared.</p>
        <ActionForm action={setGraduationFee} submit="Update fee" variant="navy" className="inline-form">
          <div className="field" style={{ margin: 0 }}><label htmlFor="gfee">Graduation fee (K)</label><input id="gfee" name="fee" inputMode="decimal" defaultValue={String(fee)} style={{ width: 140 }} /></div>
        </ActionForm>
      </div>
      <nav className="seg" aria-label="Show">
        {([["all", "Everyone"], ["unpaid", "Not paid"], ["paid", "Paid"]] as const).map(([v, l]) => (
          <Link key={v} href={`/admin/students/graduation${qs({ show: v === "all" ? "" : v })}`} className={show === v ? "on" : ""}>{l}</Link>
        ))}
      </nav>
      {intakes.length > 1 && <p className="hint" style={{ marginBottom: 12 }}>Intake: <Link className="copy" href={`/admin/students/graduation${qs({ intake: "" })}`}>All</Link>{intakes.map((i) => <span key={i}> · <Link className="copy" href={`/admin/students/graduation${qs({ intake: i })}`}>{i}</Link></span>)}</p>}

      <ActionForm action={saveGraduationPayments} submit="Save" variant="orange">
        <TableSearch target="grad-table" />
        <div className="atable" style={{ overflowX: "auto" }}>
          <table className="mini" id="grad-table" style={{ minWidth: 620 }}>
            <thead><tr><th>Student</th><th style={{ textAlign: "center" }}>Paid K{fee}</th><th>Date paid</th><th className="num">Other balances</th><th>Receipt</th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className={s.graduation_paid_on ? "" : "owing"} data-search={`${s.full_name} ${s.student_no}`.toLowerCase()}>
                  <td><input type="hidden" name="sid" value={s.id} /><Link className="copy" href={`/admin/students/${s.id}`}>{s.full_name}</Link><br /><small className="sub">{s.student_no}</small></td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" name={`paid_${s.id}`} defaultChecked={!!s.graduation_paid_on} aria-label={`${s.full_name} paid graduation fee`} /></td>
                  <td><input type="date" name={`date_${s.id}`} defaultValue={s.graduation_paid_on ?? ""} className="mini-input" style={{ width: 160, textAlign: "left" }} aria-label={`${s.full_name} date paid`} /></td>
                  <td className="num" style={{ color: owes(s) > 0 ? "var(--warn)" : "var(--ok)" }}>{owes(s) > 0 ? `K${owes(s).toLocaleString()}` : "Cleared"}</td>
                  <td>{s.graduation_paid_on ? <Link className="copy" href={`/admin/students/${s.id}/graduation-receipt`} target="_blank">Print</Link> : <span className="sub">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted-row" style={{ padding: 16 }}>No students here.</p>}
        </div>
        <p className="hint">Leave the date empty to use today&apos;s date.</p>
      </ActionForm>
    </>
  );
}
