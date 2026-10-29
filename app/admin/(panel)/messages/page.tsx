import ActionForm from "@/components/ActionForm";
import { managementPage } from "@/lib/admin";
import { deleteMessage, sendMessage } from "../../actions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to = "" } = await searchParams;
  const { supabase } = await managementPage();

  const [{ data: staff }, { data: students }, { data: sent }, { data: reads }] = await Promise.all([
    supabase.from("staff").select("user_id,full_name,is_lecturer,is_management").order("full_name"),
    supabase.from("students").select("id,student_no,full_name,status,user_id").neq("status", "Withdrawn").is("archived_at", null).order("student_no"),
    supabase.from("messages").select("id,audience,student_id,staff_id,subject,body,created_at,sender_id,sender_name,category,module_code").order("created_at", { ascending: false }).limit(80),
    supabase.from("message_reads").select("message_id,user_id"),
  ]);

  const active = (staff ?? []).filter((s) => s.is_lecturer || s.is_management);
  const lecturers = active.filter((s) => s.is_lecturer);
  const staffName = (id: string | null) => active.find((s) => s.user_id === id)?.full_name ?? "Former staff";
  const student = (id: string | null) => (students ?? []).find((s) => s.id === id);
  const readers = (mid: string) => (reads ?? []).filter((r) => r.message_id === mid).map((r) => r.user_id);

  const recipient = (m: NonNullable<typeof sent>[number]) => {
    if (m.audience === "all_lecturers") return "All lecturers";
    if (m.audience === "staff") return staffName(m.staff_id);
    const s = student(m.student_id);
    return s ? `${s.full_name} (${s.student_no})` : "Student";
  };
  const receipt = (m: NonNullable<typeof sent>[number]) => {
    const r = readers(m.id);
    if (m.audience === "all_lecturers") {
      const n = lecturers.filter((l) => r.includes(l.user_id)).length;
      return { text: `Read by ${n} of ${lecturers.length}`, ok: lecturers.length > 0 && n === lecturers.length };
    }
    const target = m.audience === "staff" ? m.staff_id : student(m.student_id)?.user_id;
    const seen = !!target && r.includes(target);
    return { text: seen ? "Read" : "Not read yet", ok: seen };
  };

  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Messages</p><h1>Messages</h1></div></div>
      <p className="hint" style={{ marginBottom: 20, maxWidth: 720 }}>
        Messages are private: only the person they&apos;re sent to can read them. For a notice to every student, use Announcements and choose &quot;Students only&quot;.
      </p>

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <section className="rec">
          <div className="rec-h"><h2>New message</h2></div>
          <div className="rec-b" style={{ paddingBlock: 20 }}>
            <ActionForm action={sendMessage} submit="Send (portal)" secondary={{ label: "Send + SMS", value: "sms" }} resetOnSuccess>
              <div className="field">
                <label htmlFor="m-to">To</label>
                <select id="m-to" name="to" defaultValue={to}>
                  <option value="" disabled>Choose a recipient…</option>
                  <optgroup label="Staff">
                    <option value="all_lecturers">All lecturers ({lecturers.length})</option>
                    {active.map((s) => (
                      <option key={s.user_id} value={`staff:${s.user_id}`}>{s.full_name}{s.is_lecturer ? " · Lecturer" : ""}{s.is_management ? " · Management" : ""}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Students">
                    {(students ?? []).map((s) => <option key={s.id} value={`student:${s.id}`}>{s.full_name} · {s.student_no}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="field"><label htmlFor="m-subj">Subject</label><input id="m-subj" name="subject" placeholder="Outstanding balance" /></div>
              <div className="field"><label htmlFor="m-body">Message</label><textarea id="m-body" name="body" rows={6} /></div>
              <p className="hint">Send (portal) puts it in their portal or staff inbox. Send + SMS also texts it to their phone through Africa&apos;s Talking (uses SMS credit; long messages are shortened in the text).</p>
            </ActionForm>
          </div>
        </section>

        <section className="rec">
          <div className="rec-h"><h2>All messages</h2><span className="hint" style={{ margin: 0 }}>Includes lecturer comments to students</span></div>
          <div className="rec-b">
            {(sent ?? []).length === 0 && <p className="muted-row">No messages sent yet.</p>}
            {(sent ?? []).map((m) => {
              const rc = receipt(m);
              return (
                <details className="msg" key={m.id}>
                  <summary>
                    <div style={{ minWidth: 0 }}>
                      <b>{m.category === "performance" && <span className="tag">Performance</span>}{m.subject}</b>
                      <small>From {m.sender_name ?? "Office"}{m.module_code ? ` (${m.module_code})` : ""} to {recipient(m)} · {when(m.created_at)}</small>
                    </div>
                    <span className={`pill ${rc.ok ? "ok" : "wait"}`}>{rc.text}</span>
                  </summary>
                  <p className="abody">{m.body}</p>
                  <form action={deleteMessage.bind(null, m.id)}><button className="del" type="submit">Delete message</button></form>
                </details>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
