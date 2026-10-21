import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { kwacha, managementPage } from "@/lib/admin";
import { deletePayrollRun, markAllPaid, markPayslipPaid, markPayslipUnpaid, savePayslip } from "../../../actions";

const monthName = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lusaka" });

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const [{ data: run }, { data: slips }, { data: staff }] = await Promise.all([
    supabase.from("payroll_runs").select("id,period").eq("id", id).maybeSingle(),
    supabase.from("payslips").select("*").eq("run_id", id),
    supabase.from("staff").select("user_id,full_name"),
  ]);
  if (!run) notFound();
  const name = (u: string) => (staff ?? []).find((s) => s.user_id === u)?.full_name ?? "Former staff";
  const rows = (slips ?? []).sort((a, b) => name(a.staff_id).localeCompare(name(b.staff_id)));
  const total = rows.reduce((t, r) => t + Number(r.net_pay), 0);
  const paidTotal = rows.filter((r) => r.status === "paid").reduce((t, r) => t + Number(r.net_pay), 0);
  const pending = rows.filter((r) => r.status === "pending");
  const today = new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/payroll">Payroll</Link> / {monthName(run.period)}</p><h1>{monthName(run.period)} payroll</h1></div>
        <div className="bal"><span className="k">Paid / total net</span><span className="v">{kwacha(paidTotal)} <small style={{ fontSize: "1rem", color: "var(--muted)" }}>of {kwacha(total)}</small></span></div>
      </div>

      {pending.length > 0 && (
        <section className="rec" style={{ marginBottom: 24 }}>
          <div className="rec-b" style={{ paddingBlock: 18 }}>
            <ActionForm action={markAllPaid.bind(null, id)} submit={`Mark all ${pending.length} remaining as paid`}>
              <div className="fgrid">
                <div className="field"><label htmlFor="all-date">Date paid</label><input id="all-date" name="paid_on" type="date" defaultValue={today} /></div>
              </div>
              <p className="hint">Use this once the money has actually gone out. To add transaction references, mark each person individually below.</p>
            </ActionForm>
          </div>
        </section>
      )}

      <div className="cards">
        {rows.map((r) => (
          <section className="rec" key={r.id}>
            <div className="rec-h">
              <div><h2>{name(r.staff_id)}</h2><small className="sub">Net {kwacha(r.net_pay)}</small></div>
              <span className={`pill ${r.status === "paid" ? "ok" : "warn"}`}>{r.status === "paid" ? "Paid" : "Pending"}</span>
            </div>
            <div className="rec-b" style={{ paddingBlock: 16, display: "grid", gap: 14 }}>
              {r.status === "paid" ? (
                <>
                  <div className="kv"><span className="k">Basic</span><span className="v">{kwacha(r.basic)}</span></div>
                  <div className="kv"><span className="k">Allowances</span><span className="v">{kwacha(r.allowances)}</span></div>
                  <div className="kv"><span className="k">Deductions</span><span className="v">{kwacha(r.deductions)}</span></div>
                  <div className="kv"><span className="k">NAPSA / NHIMA / PAYE</span><span className="v">{kwacha(r.napsa)} / {kwacha(r.nhima)} / {kwacha(r.paye)}</span></div>
                  <div className="kv"><span className="k">Paid</span><span className="v">{r.paid_at ? day(r.paid_at) : ""} · {r.method}{r.reference ? ` · ${r.reference}` : ""}</span></div>
                  {r.note && <p className="hint">{r.note}</p>}
                  <form action={markPayslipUnpaid.bind(null, r.id)}><button className="del" type="submit">Mark unpaid (to correct a mistake)</button></form>
                </>
              ) : (
                <>
                  <ActionForm action={savePayslip.bind(null, r.id)} submit="Save" variant="navy">
                    <div className="fgrid">
                      <div className="field"><label htmlFor={`b-${r.id}`}>Basic (K)</label><input id={`b-${r.id}`} name="basic" inputMode="decimal" defaultValue={String(r.basic)} /></div>
                      <div className="field"><label htmlFor={`a-${r.id}`}>Allowances (K)</label><input id={`a-${r.id}`} name="allowances" inputMode="decimal" defaultValue={String(r.allowances)} /></div>
                      <div className="field"><label htmlFor={`d-${r.id}`}>Other deductions (K)</label><input id={`d-${r.id}`} name="deductions" inputMode="decimal" defaultValue={String(r.deductions)} /></div>
                      <div className="field"><label htmlFor={`m-${r.id}`}>Paid by</label>
                        <select id={`m-${r.id}`} name="method" defaultValue={r.method ?? "Bank"}><option>Bank</option><option>Mobile money</option><option>Cash</option></select>
                      </div>
                      <div className="field full hint">Statutory (auto): NAPSA {kwacha(r.napsa)} · NHIMA {kwacha(r.nhima)} · PAYE {kwacha(r.paye)}</div>
                      <div className="field full"><label htmlFor={`n-${r.id}`}>Note on payslip (optional)</label><input id={`n-${r.id}`} name="note" defaultValue={r.note ?? ""} placeholder="e.g. Transport allowance; NAPSA deducted" /></div>
                    </div>
                  </ActionForm>
                  <ActionForm action={markPayslipPaid.bind(null, r.id)} submit="Mark as paid">
                    <div className="fgrid">
                      <div className="field"><label htmlFor={`r-${r.id}`}>Transaction reference</label><input id={`r-${r.id}`} name="reference" placeholder="Optional" /></div>
                      <div className="field"><label htmlFor={`pd-${r.id}`}>Date paid</label><input id={`pd-${r.id}`} name="paid_on" type="date" defaultValue={today} /></div>
                    </div>
                  </ActionForm>
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      {rows.every((r) => r.status === "pending") && (
        <form action={deletePayrollRun.bind(null, id)} style={{ marginTop: 24 }}>
          <button className="del" type="submit">Delete this payroll run (nothing has been paid yet)</button>
        </form>
      )}
    </>
  );
}
