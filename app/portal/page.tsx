import { redirect } from "next/navigation";
import Announcements, { type Announcement } from "@/components/Announcements";
import GradeBadge from "@/components/GradeBadge";
import Logo from "@/components/Logo";
import { gradeFor, type GradeBand } from "@/lib/grades";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import { signOut } from "./actions";

export const metadata = { title: "Student Portal" };
export const dynamic = "force-dynamic";

type Student = { id: string; student_no: string; full_name: string; programme: string; session: string; status: string };
type ModuleRow = { module_code: string; status: string; ca_mark: number | null; exam_mark: number | null; final_mark: number | null; modules: { name: string; sort: number } };

const kwacha = (n: number) => `K ${Number(n).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number | null) => (n === null ? "–" : `${Number(n)}%`);
const pill = (s: string) => (s === "Completed" ? "ok" : s === "In progress" ? "warn" : "wait");
const statusPill = (s: string) => (s === "Registered" || s === "Completed" ? "ok" : s === "Suspended" ? "warn" : "wait");
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });

export default async function Portal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  // Row level security returns only this student's own record.
  const { data: student } = await supabase.from("students").select("id,student_no,full_name,programme,session,status").eq("user_id", user.id).maybeSingle<Student>();

  if (!student) {
    return (
      <div className="login"><div className="wrap"><div className="lcard">
        <h1>Record not found</h1>
        <p style={{ textAlign: "center" }}>Your login works, but no student record is linked to it yet. Contact the office on {SITE.directorPhone}.</p>
        <form action={signOut}><button className="btn btn-orange" style={{ width: "100%" }}>Sign out</button></form>
      </div></div></div>
    );
  }

  const since = new Date(Date.now() - 2 * 3600e3).toISOString();
  const [{ data: acc }, { data: mods }, { data: ann }, { data: pays }, { data: classes }, { data: notes }, { data: scaleRows }, { data: msgs }] = await Promise.all([
    supabase.from("student_accounts").select("fees_balance,remark").eq("student_id", student.id).maybeSingle(),
    supabase.from("student_modules").select("module_code,status,ca_mark,exam_mark,final_mark,modules(name,sort)").eq("student_id", student.id),
    supabase.from("announcements").select("id,title,body,posted_on,module_code").order("posted_on", { ascending: false }).order("created_at", { ascending: false }).limit(8),
    supabase.from("payments").select("id,amount,method,reference,paid_on").eq("student_id", student.id).order("paid_on", { ascending: false }),
    supabase.from("classes").select("id,module_code,title,starts_at,duration_min,meeting_url,details").gte("starts_at", since).order("starts_at").limit(8),
    supabase.from("notes").select("id,module_code,title,file_path,file_name,created_at").order("created_at", { ascending: false }),
    supabase.from("grade_scale").select("letter,min_mark,remark,is_pass").order("min_mark", { ascending: false }),
    supabase.from("messages").select("id,subject,body,created_at").eq("audience", "student").eq("student_id", student.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const scale = (scaleRows ?? []) as GradeBand[];

  const modules = ((mods ?? []) as unknown as ModuleRow[]).sort((a, b) => a.modules.sort - b.modules.sort);
  const done = modules.filter((m) => m.status === "Completed").length;
  const bal = Number(acc?.fees_balance ?? 0);
  const owing = bal > 0;
  const paid = (pays ?? []).reduce((t, p) => t + Number(p.amount), 0);

  // Messages: highlight unread ones, then mark them read (opening the portal counts as reading).
  const msgIds = (msgs ?? []).map((m) => m.id);
  const { data: reads } = msgIds.length
    ? await supabase.from("message_reads").select("message_id").eq("user_id", user.id).in("message_id", msgIds)
    : { data: [] as { message_id: string }[] };
  const readSet = new Set((reads ?? []).map((r) => r.message_id));
  const unread = msgIds.filter((id) => !readSet.has(id));
  if (unread.length) {
    await supabase.from("message_reads").upsert(unread.map((message_id) => ({ message_id, user_id: user.id })), { onConflict: "message_id,user_id", ignoreDuplicates: true });
  }
  const modName = (c: string) => modules.find((m) => m.module_code === c)?.modules.name ?? c;

  const urls = new Map<string, string>();
  if ((notes ?? []).length) {
    const { data: signed } = await supabase.storage.from("notes").createSignedUrls(notes!.map((n) => n.file_path), 3600);
    (signed ?? []).forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  const noteGroups = modules
    .map((m) => ({ code: m.module_code, name: m.modules.name, items: (notes ?? []).filter((n) => n.module_code === m.module_code) }))
    .filter((g) => g.items.length);

  const annItems = ((ann ?? []) as (Announcement & { module_code: string | null })[]).map((a) => ({
    ...a, title: a.module_code ? `${a.module_code}: ${a.title}` : a.title,
  }));

  return (
    <div className="page-soft" style={{ minHeight: "100vh" }}>
      <div className="pbar">
        <div className="wrap">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Logo size={40} /><b>Student Portal</b></div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pid">{student.student_no}</span>
            <form action={signOut}><button className="btn btn-orange btn-sm">Sign out</button></form>
          </div>
        </div>
      </div>
      <div className="phello">
        <div className="wrap">
          <p className="eyebrow" style={{ fontSize: ".75rem" }}>Welcome back</p>
          <h1>{student.full_name}</h1>
        </div>
      </div>

      <div className="wrap pgrid">
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          <div className="rec">
            <div className="rec-h"><h2>Student Record</h2><span className={`pill ${statusPill(student.status)}`}>{student.status}</span></div>
            <div className="rec-b">
              <div className="kv"><span className="k">Student ID</span><span className="v">{student.student_no}</span></div>
              <div className="kv"><span className="k">Programme</span><span className="v">{student.programme}</span></div>
              <div className="kv"><span className="k">Session</span><span className="v">{student.session}</span></div>
              <div className="kv"><span className="k">Fees balance</span><span className="v" style={{ color: owing ? "var(--warn)" : "var(--ok)" }}>{owing ? kwacha(bal) : "Fully paid"}</span></div>
              {acc?.remark && <div className="kv"><span className="k">Remark</span><span className="v">{acc.remark}</span></div>}
            </div>
          </div>

          <div className="rec">
            <div className="rec-h"><h2>Results</h2><span style={{ fontSize: ".85rem", color: "var(--muted)" }}>{done} of {modules.length} completed</span></div>
            <div className="prog"><span style={{ width: `${modules.length ? (done / modules.length) * 100 : 0}%` }} /></div>
            <div className="rec-b" style={{ overflowX: "auto" }}>
              <table className="results">
                <thead><tr><th>Module</th><th className="num">CA</th><th className="num">Exam</th><th className="num">Final</th><th className="num">Grade</th></tr></thead>
                <tbody>
                  {modules.map((m) => (
                    <tr key={m.module_code}>
                      <td><span className="code">{m.module_code}</span>{m.modules.name}<br /><span className={`pill ${pill(m.status)}`} style={{ marginTop: 4 }}>{m.status}</span></td>
                      <td className="num">{pct(m.ca_mark)}</td>
                      <td className="num">{pct(m.exam_mark)}</td>
                      <td className="num final">{pct(m.final_mark)}</td>
                      <td className="num"><GradeBadge grade={gradeFor(m.final_mark, scale)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="hint" style={{ padding: "10px 0 6px" }}>Final mark = CA 40% + Exam 60%. Grades: {scale.map((g) => `${g.letter} ${Number(g.min_mark)}+`).join(", ")}. Pass mark {Number(scale.filter((g) => g.is_pass).at(-1)?.min_mark ?? 50)}%.</p>
            </div>
          </div>

          <div className="rec">
            <div className="rec-h"><h2>Notes</h2></div>
            <div className="rec-b">
              {noteGroups.length === 0 && <p className="muted-row">Your lecturers haven&apos;t uploaded notes yet.</p>}
              {noteGroups.map((g) => (
                <div className="notegroup" key={g.code}>
                  <h3>{g.code} · {g.name}</h3>
                  {g.items.map((n) => (
                    <div className="row" key={n.id}>
                      <div style={{ minWidth: 0 }}><b>{n.title}</b><small>{n.file_name}</small></div>
                      {urls.get(n.file_path) && <a className="btn btn-sm btn-navy" href={urls.get(n.file_path)} target="_blank" rel="noreferrer">Download</a>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
          <div className="rec">
            <div className="rec-h"><h2>Messages</h2>{unread.length > 0 && <span className="pill warn">{unread.length} new</span>}</div>
            <div className="rec-b">
              {(msgs ?? []).length === 0 && <p className="muted-row">No messages from the office.</p>}
              {(msgs ?? []).map((m) => (
                <div className={`msgcard ${readSet.has(m.id) ? "" : "unread"}`} key={m.id}>
                  <b>{m.subject}</b>
                  <small>From the office · {when(m.created_at)}</small>
                  <p className="abody">{m.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rec">
            <div className="rec-h"><h2>Upcoming classes</h2></div>
            <div className="rec-b">
              {(classes ?? []).length === 0 && <p className="muted-row">No classes scheduled right now.</p>}
              {(classes ?? []).map((c) => (
                <div className="row" key={c.id} style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <b>{c.title}</b>
                    <small>{c.module_code} · {modName(c.module_code)}</small>
                    <small style={{ display: "block" }}>{when(c.starts_at)} · {c.duration_min} min</small>
                    {c.details && <p className="abody">{c.details}</p>}
                  </div>
                  {c.meeting_url && <a className="btn btn-sm btn-orange" href={c.meeting_url} target="_blank" rel="noreferrer">Join</a>}
                </div>
              ))}
            </div>
          </div>

          <div className="rec">
            <div className="rec-h"><h2>Fees and payments</h2></div>
            <div className="feesum">
              <div><div className="k">Total fees</div><div className="v">{kwacha(paid + bal)}</div></div>
              <div><div className="k">Paid</div><div className="v" style={{ color: "var(--ok)" }}>{kwacha(paid)}</div></div>
              <div><div className="k">Balance</div><div className="v" style={{ color: owing ? "var(--warn)" : "var(--ok)" }}>{owing ? kwacha(bal) : "K 0.00"}</div></div>
            </div>
            <div className="rec-b">
              {(pays ?? []).length === 0 && <p className="muted-row">No payments recorded yet.</p>}
              {(pays ?? []).map((p) => (
                <div className="row" key={p.id}>
                  <div><b>{kwacha(p.amount)}</b><small>{p.paid_on} · {p.method}{p.reference ? ` · Ref ${p.reference}` : ""}</small></div>
                </div>
              ))}
              {(pays ?? []).length > 0 && <p className="hint" style={{ padding: "8px 0 12px" }}>If a payment is missing, bring your receipt to the office.</p>}
            </div>
          </div>

          <div className="rec">
            <div className="rec-h"><h2>Announcements</h2></div>
            <div style={{ padding: 16 }}>
              <Announcements items={annItems} empty="No announcements yet." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
