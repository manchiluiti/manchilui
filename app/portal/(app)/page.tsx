import Link from "next/link";
import Announcements, { type Announcement } from "@/components/Announcements";
import { feeSummary, kwacha, myModules, requirePortalStudent, unreadMessages, when } from "@/lib/portal";

const statusPill = (s: string) => (s === "Registered" || s === "Completed" ? "ok" : s === "Suspended" ? "warn" : "wait");

export default async function PortalDashboard() {
  const { supabase, user, student } = await requirePortalStudent();
  const since = new Date(Date.now() - 2 * 3600e3).toISOString();
  const [fees, modules, unread, { data: ann }, { data: classes }] = await Promise.all([
    feeSummary(supabase, student.id),
    myModules(supabase, student.id),
    unreadMessages(supabase, user.id, student.id),
    student.archived_at ? Promise.resolve({ data: [] }) : supabase.from("announcements").select("id,title,body,posted_on,module_code").in("audience", ["public", "students", "staff_students", "module"]).order("posted_on", { ascending: false }).order("created_at", { ascending: false }).limit(5),
    student.archived_at ? Promise.resolve({ data: [] }) : supabase.from("classes").select("id,module_code,title,starts_at,duration_min,meeting_url,details").gte("starts_at", since).order("starts_at").limit(5),
  ]);
  const done = modules.filter((m) => m.status === "Completed").length;
  const modName = (c: string) => modules.find((m) => m.module_code === c)?.modules.name ?? c;
  const annItems = ((ann ?? []) as (Announcement & { module_code: string | null })[]).map((a) => ({ ...a, title: a.module_code ? `${a.module_code}: ${a.title}` : a.title }));

  return (
    <div className="pgrid">
      <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
        <div className="rec">
          <div className="rec-h"><h2>Dashboard</h2><span className={`pill ${statusPill(student.status)}`}>{student.status}</span></div>
          <div className="rec-b">
            <div className="kv"><span className="k">Student ID</span><span className="v">{student.student_no}</span></div>
            <div className="kv"><span className="k">Programme</span><span className="v">{student.programme}</span></div>
            <div className="kv"><span className="k">Session</span><span className="v">{student.session}</span></div>
            {fees.remark && <div className="kv"><span className="k">Remark</span><span className="v">{fees.remark}</span></div>}
          </div>
          <div className="feesum ptiles">
            <Link href="/portal/fees"><div className="k">Fees balance</div><div className="v" style={{ color: fees.owing ? "var(--warn)" : "var(--ok)" }}>{fees.owing ? kwacha(fees.bal) : "Fully paid"}</div><span className="more">Fees & payments →</span></Link>
            <Link href="/portal/results"><div className="k">Modules completed</div><div className="v">{done} of {modules.length}</div><span className="more">Results →</span></Link>
            <Link href="/portal/messages"><div className="k">Messages</div><div className="v" style={{ color: unread.length ? "var(--orange)" : undefined }}>{unread.length ? `${unread.length} new` : "None new"}</div><span className="more">Read →</span></Link>
          </div>
          <div style={{ height: 20 }} />
        </div>

        <div className="rec">
          <div className="rec-h"><h2>Announcements</h2></div>
          <div style={{ padding: 16 }}><Announcements items={annItems} empty="No announcements yet." /></div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
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
      </div>
    </div>
  );
}
