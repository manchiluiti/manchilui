import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { kwacha, managementPage } from "@/lib/admin";
import { saveStaffPay, startPayroll } from "../../actions";

const monthName = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });

export default async function PayrollPage() {
  const { supabase } = await managementPage();
  const [{ data: staff }, { data: pay }, { data: runs }, { data: slips }] = await Promise.all([
    supabase.from("staff").select("user_id,full_name,is_management,is_lecturer").order("full_name"),
    supabase.from("staff_pay").select("user_id,basic_salary,pay_method,pay_to,phone"),
    supabase.from("payroll_runs").select("id,period").order("period", { ascending: false }),
    supabase.from("payslips").select("run_id,net_pay,status"),
  ]);
  const active = (staff ?? []).filter((s) => s.is_management || s.is_lecturer);
  const payOf = (id: string) => (pay ?? []).find((p) => p.user_id === id);
  const monthly = active.reduce((t, s) => t + Number(payOf(s.user_id)?.basic_salary ?? 0), 0);
  const missing = active.filter((s) => !Number(payOf(s.user_id)?.basic_salary ?? 0));

  const now = new Date(Date.now() + 2 * 3600e3);
  const thisMonth = now.toISOString().slice(0, 7);

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Payroll</p><h1>Staff salaries</h1></div>
        <div className="bal"><span className="k">Monthly basic salaries</span><span className="v">{kwacha(monthly)}</span></div>
      </div>

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>Run payroll</h2></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <ActionForm action={startPayroll} submit="Start payroll">
                <div className="field"><label htmlFor="pr-month">Month</label><input id="pr-month" name="month" type="month" defaultValue={thisMonth} /></div>
                <p className="hint">Creates a payslip for every staff member with their basic salary. You can add allowances and deductions before marking them paid. Staff only see a payslip once it&apos;s marked paid.</p>
              </ActionForm>
              {missing.length > 0 && <div className="warnbox" style={{ marginTop: 16, marginBottom: 0 }}>No salary set for: {missing.map((m) => m.full_name).join(", ")}</div>}
            </div>
          </section>

          <section className="rec">
            <div className="rec-h"><h2>Payroll history</h2></div>
            <div className="rec-b">
              {(runs ?? []).length === 0 && <p className="muted-row">No payroll run yet.</p>}
              {(runs ?? []).map((r) => {
                const rs = (slips ?? []).filter((s) => s.run_id === r.id);
                const paid = rs.filter((s) => s.status === "paid").length;
                const total = rs.reduce((t, s) => t + Number(s.net_pay), 0);
                return (
                  <Link className="row" key={r.id} href={`/admin/payroll/${r.id}`}>
                    <div><b>{monthName(r.period)}</b><small>{rs.length} staff · {kwacha(total)} net</small></div>
                    <span className={`pill ${paid === rs.length && rs.length ? "ok" : "warn"}`}>{paid === rs.length && rs.length ? "All paid" : `${paid} of ${rs.length} paid`}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rec">
          <div className="rec-h"><h2>Salary settings</h2></div>
          <div className="rec-b">
            {active.length === 0 && <p className="muted-row">Add staff on the Staff page first.</p>}
            {active.map((s) => {
              const p = payOf(s.user_id);
              return (
                <details className="msg" key={s.user_id}>
                  <summary>
                    <div><b>{s.full_name}</b><small>{p ? `${p.pay_method}${p.pay_to ? ` · ${p.pay_to}` : ""}` : "Not set"}</small></div>
                    <span className="amt" style={{ color: "var(--navy)", fontWeight: 700 }}>{p ? kwacha(p.basic_salary) : "–"}</span>
                  </summary>
                  <div style={{ paddingTop: 12 }}>
                    <ActionForm action={saveStaffPay.bind(null, s.user_id)} submit="Save salary" variant="navy">
                      <div className="fgrid">
                        <div className="field"><label htmlFor={`bs-${s.user_id}`}>Basic monthly salary (K)</label><input id={`bs-${s.user_id}`} name="basic_salary" inputMode="decimal" defaultValue={p ? String(p.basic_salary) : ""} /></div>
                        <div className="field"><label htmlFor={`pm-${s.user_id}`}>Paid by</label>
                          <select id={`pm-${s.user_id}`} name="pay_method" defaultValue={p?.pay_method ?? "Bank"}><option>Bank</option><option>Mobile money</option><option>Cash</option></select>
                        </div>
                        <div className="field"><label htmlFor={`ph-${s.user_id}`}>Phone for salary SMS</label><input id={`ph-${s.user_id}`} name="phone" inputMode="tel" defaultValue={p?.phone ?? ""} placeholder="0977 123 456" /></div>
                        <div className="field"><label htmlFor={`pt-${s.user_id}`}>Paid to (shown on their payslip)</label><input id={`pt-${s.user_id}`} name="pay_to" defaultValue={p?.pay_to ?? ""} placeholder="e.g. Zanaco ****4521 or Airtel ***997" /></div>
                      </div>
                      <p className="hint">Use only the last few digits of an account number.</p>
                    </ActionForm>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
