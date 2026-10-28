import ActionForm from "@/components/ActionForm";
import { managementPage } from "@/lib/admin";
import { smsConfigured } from "@/lib/sms";
import { addCalendarPeriod, removeCalendarPeriod, saveSettings, sendTestSms } from "../../actions";

const KIND: Record<string, string> = { balance_reminder: "Balance reminder", monthly_reminder: "Monthly reminder", salary_paid: "Salary paid", test: "Test" };
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });
const d = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function SettingsPage() {
  const { supabase } = await managementPage();
  const [{ data: s }, { data: cal }, { data: log }] = await Promise.all([
    supabase.from("app_settings").select("*").maybeSingle(),
    supabase.from("fee_calendar").select("*").order("starts_on", { ascending: false }),
    supabase.from("sms_log").select("id,kind,to_phone,message,status,detail,cost,created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const configured = smsConfigured();
  const today = new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
  const inCalendar = (cal ?? []).some((c) => c.starts_on <= today && c.ends_on >= today);

  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Settings</p><h1>SMS, calendar and payroll</h1></div></div>

      {!configured && <div className="warnbox">SMS isn&apos;t connected yet. Add AT_USERNAME and AT_API_KEY (Africa&apos;s Talking) in Vercel, then redeploy.</div>}

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>General settings</h2></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <ActionForm action={saveSettings} submit="Save settings" variant="navy">
                <h3 className="subhead">Text messages</h3>
                <div className="checks"><label><input type="checkbox" name="sms_enabled" defaultChecked={s?.sms_enabled} /> SMS switched on</label></div>
                <p className="hint">Only three kinds of text are ever sent: balance reminders you send by clicking, salary-paid texts to staff, and the monthly reminder below.</p>
                <div className="field"><label htmlFor="rd">Monthly fee reminder day</label>
                  <select id="rd" name="reminder_day" defaultValue={String(s?.reminder_day ?? 15)}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}{n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : n === 21 ? "st" : n === 22 ? "nd" : n === 23 ? "rd" : "th"} of each month</option>)}
                  </select>
                </div>
                <h3 className="subhead">Fees</h3>
                <div className="field"><label htmlFor="tf">Tuition fee per student (K)</label><input id="tf" name="tuition_fee" inputMode="decimal" defaultValue={String((s as { tuition_fee?: number } | null)?.tuition_fee ?? 6000)} /></div>
                <h3 className="subhead">Statutory deductions on payslips</h3>
                <div className="fgrid">
                  <div className="field"><label htmlFor="napsa">NAPSA (% of gross)</label><input id="napsa" name="napsa_rate" inputMode="decimal" defaultValue={String(s?.napsa_rate ?? 0)} /></div>
                  <div className="field"><label htmlFor="nhima">NHIMA (% of gross)</label><input id="nhima" name="nhima_rate" inputMode="decimal" defaultValue={String(s?.nhima_rate ?? 0)} /></div>
                  <div className="field"><label htmlFor="paye">PAYE (% of gross)</label><input id="paye" name="paye_rate" inputMode="decimal" defaultValue={String(s?.paye_rate ?? 0)} /></div>
                </div>
                <p className="hint">Set at 0% for now. Confirm the correct rates with your accountant before changing. PAYE is banded in law; a flat rate here is a simplification.</p>
                <h3 className="subhead">Features</h3>
                <div className="checks"><label><input type="checkbox" name="results_statement_enabled" defaultChecked={s?.results_statement_enabled} /> Statement of results (currently frozen)</label></div>
              </ActionForm>
            </div>
          </section>

          <section className="rec">
            <div className="rec-h"><h2>Fee calendar</h2><span className={`pill ${inCalendar ? "ok" : "wait"}`}>{inCalendar ? "Reminders active today" : "Outside calendar today"}</span></div>
            <div className="rec-b" style={{ paddingBlock: 16 }}>
              <p className="hint" style={{ marginBottom: 12 }}>Monthly reminders only go out on the reminder day when today falls inside one of these periods, and only to students who owe.</p>
              {(cal ?? []).map((c) => (
                <div className="row" key={c.id}>
                  <div><b>{c.label}</b><small>{d(c.starts_on)} to {d(c.ends_on)}</small></div>
                  <form action={removeCalendarPeriod.bind(null, c.id)}><button className="del" type="submit">Remove</button></form>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <ActionForm action={addCalendarPeriod} submit="Add period" resetOnSuccess>
                  <div className="field"><label htmlFor="cl">Name</label><input id="cl" name="label" placeholder="July – December 2026 session" /></div>
                  <div className="fgrid">
                    <div className="field"><label htmlFor="cs">Starts</label><input id="cs" name="starts_on" type="date" /></div>
                    <div className="field"><label htmlFor="ce">Ends</label><input id="ce" name="ends_on" type="date" /></div>
                  </div>
                </ActionForm>
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>Send a test SMS</h2></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <ActionForm action={sendTestSms} submit="Send test" variant="navy">
                <div className="field"><label htmlFor="tp">Phone number</label><input id="tp" name="phone" inputMode="tel" placeholder="0977 123 456" /></div>
              </ActionForm>
            </div>
          </section>

          <section className="rec">
            <div className="rec-h"><h2>SMS log</h2><span className="hint" style={{ margin: 0 }}>Last 50</span></div>
            <div className="rec-b">
              {(log ?? []).length === 0 && <p className="muted-row">No texts sent yet.</p>}
              {(log ?? []).map((l) => (
                <details className="msg" key={l.id}>
                  <summary>
                    <div style={{ minWidth: 0 }}><b>{KIND[l.kind] ?? l.kind} · {l.to_phone}</b><small>{when(l.created_at)}{l.cost ? ` · ${l.cost}` : ""}</small></div>
                    <span className={`pill ${l.status === "sent" ? "ok" : "warn"}`}>{l.status === "sent" ? "Sent" : "Failed"}</span>
                  </summary>
                  <p className="abody">{l.message}</p>
                  {l.status !== "sent" && <p className="hint">{l.detail}</p>}
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
