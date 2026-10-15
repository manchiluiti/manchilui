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
        <form action={signOut}><button className="btn btn-navy" style={{ width: "100%" }}>Sign out</button></form>
      </div></div></div>
    );
  }

  const [{ data: mods }, { data: ann }] = await Promise.all([
    supabase.from("student_modules").select("status,grade,modules(code,name,sort)").eq("student_id", student.id),
    supabase.from("announcements").select("id,title,body,posted_on").order("posted_on", { ascending: false }).limit(5),
  ]);

  const modules = ((mods ?? []) as unknown as ModuleRow[]).sort((a, b) => a.modules.sort - b.modules.sort);
  const done = modules.filter((m) => m.status === "Completed").length;
  const owing = Number(student.fees_balance) > 0;

  return (
    <>
      <div className="pbar">
        <div className="wrap">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo size={36} /><b>Student Portal</b></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: ".7rem" }}>{student.student_no}</span>
            <form action={signOut}><button className="btn btn-gold" style={{ padding: "8px 14px" }}>Sign out</button></form>
          </div>
        </div>
      </div>
      <div className="phead">
        <div className="wrap" style={{ paddingBlock: 24 }}>
          <div className="crumb">Welcome back</div>
          <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)" }}>{student.full_name}</h1>
        </div>
      </div>
      <div className="wrap pgrid">
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          <div className="rec">
            <div className="rec-h"><h2>Student record</h2><span className={`pill ${statusPill(student.status)}`}>{student.status}</span></div>
            <div className="kv"><span className="k">Student ID</span><span className="v">{student.student_no}</span></div>
            <div className="kv"><span className="k">Programme</span><span className="v">{student.programme}</span></div>
            <div className="kv"><span className="k">Session</span><span className="v">{student.session}</span></div>
            <div className="kv"><span className="k">Fees balance</span><span className="v" style={{ color: owing ? "var(--warn)" : "var(--ok)" }}>{owing ? kwacha(student.fees_balance) : "Fully paid"}</span></div>
            {student.remark && <div className="kv"><span className="k">Remark</span><span className="v">{student.remark}</span></div>}
          </div>
          <div className="rec">
            <div className="rec-h"><h2>Modules</h2><span className="mono" style={{ fontSize: ".72rem" }}>{done} of {modules.length} completed</span></div>
            <div className="prog" style={{ marginTop: 14 }}><span style={{ width: `${modules.length ? (done / modules.length) * 100 : 0}%` }} /></div>
            <div className="mods">
              {modules.map((m) => (
                <div className="mod" key={m.modules.code}>
                  <span><span className="code">{m.modules.code}</span>{m.modules.name}</span>
                  <span className={`pill ${pill(m.status)}`}>{m.grade ? `${m.status} · ${m.grade}` : m.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rec" style={{ alignSelf: "start" }}>
          <div className="rec-h"><h2>Announcements</h2></div>
          <div style={{ padding: 14 }}>
            <Announcements items={(ann ?? []) as Announcement[]} empty="No announcements yet." />
          </div>
        </div>
      </div>
    </>
  );
}
