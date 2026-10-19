import { redirect } from "next/navigation";
import Announcements, { type Announcement } from "@/components/Announcements";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";
import { signOut } from "./actions";

export const metadata = { title: "Student Portal" };
export const dynamic = "force-dynamic";

type Student = {
  id: string; student_no: string; full_name: string; programme: string; session: string;
  status: string; fees_balance: number; remark: string | null;
};
type ModuleRow = { status: string; grade: string | null; modules: { code: string; name: string; sort: number } };

const kwacha = (n: number) => `K ${Number(n).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pill = (s: string) => (s === "Completed" ? "ok" : s === "In progress" ? "warn" : "wait");
const statusPill = (s: string) => (s === "Registered" ? "ok" : s === "Suspended" ? "warn" : "wait");

export default async function Portal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  // RLS returns only this user's own record.
  const { data: student } = await supabase.from("students").select("*").maybeSingle<Student>();

  if (!student) {
    return (
      <div className="login"><div className="wrap"><div className="lcard">
        <h1>Record not found</h1>
        <p style={{ textAlign: "center" }}>Your login works, but no student record is linked to it yet. Contact the office on {SITE.directorPhone}.</p>
        <form action={signOut}><button className="btn btn-orange" style={{ width: "100%" }}>Sign out</button></form>
      </div></div></div>
    );
  }

  const [{ data: mods }, { data: ann }, { data: pays }] = await Promise.all([
    supabase.from("student_modules").select("status,grade,modules(code,name,sort)").eq("student_id", student.id),
    supabase.from("announcements").select("id,title,body,posted_on").order("posted_on", { ascending: false }).limit(5),
    supabase.from("payments").select("id,amount,method,paid_on").eq("student_id", student.id).order("paid_on", { ascending: false }).limit(10),
  ]);

  const modules = ((mods ?? []) as unknown as ModuleRow[]).sort((a, b) => a.modules.sort - b.modules.sort);
  const done = modules.filter((m) => m.status === "Completed").length;
  const owing = Number(student.fees_balance) > 0;

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
              <div className="kv"><span className="k">Fees balance</span><span className="v" style={{ color: owing ? "var(--warn)" : "var(--ok)" }}>{owing ? kwacha(student.fees_balance) : "Fully paid"}</span></div>
              {student.remark && <div className="kv"><span className="k">Remark</span><span className="v">{student.remark}</span></div>}
            </div>
          </div>
          <div className="rec">
            <div className="rec-h"><h2>Modules</h2><span style={{ fontSize: ".85rem", color: "var(--muted)" }}>{done} of {modules.length} completed</span></div>
            <div className="prog"><span style={{ width: `${modules.length ? (done / modules.length) * 100 : 0}%` }} /></div>
            <div className="rec-b">
              {modules.map((m) => (
                <div className="mod" key={m.modules.code}>
                  <span><span className="code">{m.modules.code}</span><span className="name">{m.modules.name}</span></span>
                  <span className={`pill ${pill(m.status)}`}>{m.grade ? `${m.status} · ${m.grade}` : m.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 24, alignContent: "start" }}>
        <div className="rec">
          <div className="rec-h"><h2>Payments</h2></div>
          <div className="rec-b">
            {(pays ?? []).length === 0 && <p className="muted-row">No payments recorded yet.</p>}
            {(pays ?? []).map((p) => (
              <div className="row" key={p.id}>
                <div><b>{kwacha(p.amount)}</b><small>{p.paid_on} · {p.method}</small></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rec">
          <div className="rec-h"><h2>Announcements</h2></div>
          <div style={{ padding: 16 }}>
            <Announcements items={(ann ?? []) as Announcement[]} empty="No announcements yet." />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
