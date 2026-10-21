import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import GradeBadge from "@/components/GradeBadge";
import { gradeFor, type GradeBand } from "@/lib/grades";
import { kwacha, managementPage, mark, MODULE_STATUSES, PAY_METHODS, STATUSES } from "@/lib/admin";
import { editPayment, recordPayment, removePayment, saveStudentMarks, sendBalanceReminder, setPassword, updateStudent } from "../../../actions";

type ModRow = { module_code: string; status: string; ca_mark: number | null; exam_mark: number | null; final_mark: number | null; modules: { name: string; sort: number } };

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase } = await managementPage();

  const [{ data: s }, { data: acc }, { data: mods }, { data: pays }, { data: scaleRows }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("student_accounts").select("fees_balance,phone,remark").eq("student_id", id).maybeSingle(),
    supabase.from("student_modules").select("module_code,status,ca_mark,exam_mark,final_mark,modules(name,sort)").eq("student_id", id),
    supabase.from("payments").select("id,receipt_no,amount,method,reference,paid_on").eq("student_id", id).order("paid_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("grade_scale").select("letter,min_mark,remark,is_pass"),
  ]);
  const scale = (scaleRows ?? []) as GradeBand[];
  if (!s) notFound();
  const bal = Number(acc?.fees_balance ?? 0);

  const modules = ((mods ?? []) as unknown as ModRow[]).sort((a, b) => a.modules.sort - b.modules.sort);
  const totalPaid = (pays ?? []).reduce((t, p) => t + Number(p.amount), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="ahead">
        <div>
          <p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/students">Students</Link> / {s.student_no}</p>
          <h1>{s.full_name}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/admin/messages?to=student:${id}`} className="btn btn-navy btn-sm">Message student</Link>
          <Link href={`/admin/students/${id}/statement`} className="btn btn-outline btn-sm">Statement of results</Link>
        </div>
        <div className="bal">
          <span className="k">Fees balance</span>
          <span className="v" style={{ color: bal > 0 ? "var(--warn)" : "var(--ok)" }}>{bal > 0 ? kwacha(bal) : "Fully paid"}</span>
        </div>
      </div>
      {created && <div className="ok-msg" style={{ marginBottom: 20 }}>Student and login created. They can now sign in with {s.student_no}.</div>}

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>Record a payment</h2></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <ActionForm action={recordPayment.bind(null, id)} submit="Record payment" resetOnSuccess>
                <div className="fgrid">
                  <div className="field"><label htmlFor="p-amt">Amount (K)</label><input id="p-amt" name="amount" inputMode="decimal" placeholder="500" /></div>
                  <div className="field"><label htmlFor="p-method">Paid by</label><select id="p-method" name="method">{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
                  <div className="field"><label htmlFor="p-ref">Receipt / reference</label><input id="p-ref" name="reference" placeholder="Optional" /></div>
                  <div className="field"><label htmlFor="p-date">Date</label><input id="p-date" name="paid_on" type="date" defaultValue={today} /></div>
                </div>
              </ActionForm>
            </div>
          </section>

          <section className="rec">
            <div className="rec-h"><h2>Fees</h2>{bal > 0 && <ActionForm action={sendBalanceReminder.bind(null, id)} submit="Send balance reminder SMS" variant="navy" className="inline-form"><span /></ActionForm>}</div>
            <div className="feesum">
              <div><div className="k">Total fees</div><div className="v">{kwacha(totalPaid + bal)}</div></div>
              <div><div className="k">Paid</div><div className="v" style={{ color: "var(--ok)" }}>{kwacha(totalPaid)}</div></div>
              <div><div className="k">Balance</div><div className="v" style={{ color: bal > 0 ? "var(--warn)" : "var(--ok)" }}>{kwacha(bal)}</div></div>
            </div>
            <div className="rec-b">
              {(pays ?? []).length === 0 && <p className="muted-row">No payments recorded yet.</p>}
              {(pays ?? []).map((p) => (
                <div className="row wrapable" key={p.id}>
                  <div><b>{kwacha(p.amount)}</b><small>{p.paid_on} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</small></div>
                  <Link className="copy" href={`/admin/receipt/${p.id}`}>Receipt</Link>
                  <details className="payedit">
                    <summary>Edit</summary>
                    <ActionForm action={editPayment.bind(null, p.id)} submit="Save changes" variant="navy">
                      <div className="fgrid">
                        <div className="field"><label htmlFor={`ea-${p.id}`}>Amount (K)</label><input id={`ea-${p.id}`} name="amount" inputMode="decimal" defaultValue={String(p.amount)} /></div>
                        <div className="field"><label htmlFor={`em-${p.id}`}>Paid by</label><select id={`em-${p.id}`} name="method" defaultValue={p.method}>{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
                        <div className="field"><label htmlFor={`er-${p.id}`}>Receipt / reference</label><input id={`er-${p.id}`} name="reference" defaultValue={p.reference ?? ""} /></div>
                        <div className="field"><label htmlFor={`ed-${p.id}`}>Date</label><input id={`ed-${p.id}`} name="paid_on" type="date" defaultValue={p.paid_on} /></div>
                      </div>
                      <p className="hint">The balance adjusts automatically.</p>
                    </ActionForm>
                    <form action={removePayment.bind(null, p.id)} style={{ marginTop: 8 }}>
                      <button className="del" type="submit">Remove this payment (adds {kwacha(p.amount)} back to the balance)</button>
                    </form>
                  </details>
                </div>
              ))}
            </div>
          </section>

          <section className="rec">
            <div className="rec-h"><h2>Portal login</h2><span className={`pill ${s.user_id ? "ok" : "warn"}`}>{s.user_id ? "Active" : "No login"}</span></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <ActionForm action={setPassword.bind(null, id)} submit={s.user_id ? "Change password" : "Create login"} variant="navy" resetOnSuccess>
                <div className="field"><label htmlFor="pw">New password</label><input id="pw" name="password" autoComplete="new-password" placeholder="At least 6 characters" /></div>
                <p className="hint">The student signs in with <b>{s.student_no}</b> and this password.</p>
              </ActionForm>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>Results</h2><span className="hint" style={{ margin: 0 }}>Final = CA 40% + Exam 60%</span></div>
            <div className="rec-b" style={{ paddingBlock: 12 }}>
              <ActionForm action={saveStudentMarks.bind(null, id)} submit="Save results">
                <div className="mhead"><span>Module</span><span>Status</span><span>CA</span><span>Exam</span><span>Final</span></div>
                <div className="modedit">
                  {modules.map((m) => (
                    <div className="modrow marks" key={m.module_code}>
                      <input type="hidden" name="code" value={m.module_code} />
                      <div className="mname"><span className="code">{m.module_code}</span>{m.modules.name}</div>
                      <select name={`status_${m.module_code}`} defaultValue={m.status} aria-label={`${m.modules.name} status`}>
                        {MODULE_STATUSES.map((st) => <option key={st}>{st}</option>)}
                      </select>
                      <input name={`ca_${m.module_code}`} defaultValue={m.ca_mark ?? ""} inputMode="decimal" placeholder="–" aria-label={`${m.modules.name} CA mark`} />
                      <input name={`exam_${m.module_code}`} defaultValue={m.exam_mark ?? ""} inputMode="decimal" placeholder="–" aria-label={`${m.modules.name} exam mark`} />
                      <span className="final">{mark(m.final_mark)} <GradeBadge grade={gradeFor(m.final_mark, scale)} /></span>
                    </div>
                  ))}
                </div>
              </ActionForm>
            </div>
          </section>

          <section className="rec">
            <div className="rec-h"><h2>Details</h2></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <ActionForm action={updateStudent.bind(null, id)} submit="Save details" variant="navy">
                <div className="fgrid">
                  <div className="field"><label htmlFor="d-name">Full name</label><input id="d-name" name="full_name" defaultValue={s.full_name} /></div>
                  <div className="field"><label htmlFor="d-phone">Phone</label><input id="d-phone" name="phone" defaultValue={acc?.phone ?? ""} /></div>
                  <div className="field"><label htmlFor="d-session">Session</label><input id="d-session" name="session" defaultValue={s.session} /></div>
                  <div className="field"><label htmlFor="d-status">Status</label><select id="d-status" name="status" defaultValue={s.status}>{STATUSES.map((st) => <option key={st}>{st}</option>)}</select></div>
                  <div className="field"><label htmlFor="d-fees">Fees balance (K)</label><input id="d-fees" name="fees_balance" inputMode="decimal" defaultValue={String(bal)} /></div>
                  <div className="field full"><label htmlFor="d-remark">Remark shown to student</label><input id="d-remark" name="remark" defaultValue={acc?.remark ?? ""} placeholder="e.g. Balance due before final exams" /></div>
                </div>
                <p className="hint">Use Record a payment for money received. Edit the balance here only to add charges or correct a mistake.</p>
              </ActionForm>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
