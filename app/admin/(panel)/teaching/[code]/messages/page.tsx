import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { fmtWhen, getStaff } from "@/lib/admin";
import { deleteAnnouncement, deleteMessage, postModuleAnnouncement, sendStudentComment } from "../../../../actions";

type Row = { student_id: string; students: { full_name: string; student_no: string; status: string; archived_at: string | null } | null };

export default async function ModuleMessagesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const sb = staff.supabase;

  const { data: mod } = await sb.from("modules").select("code,name").eq("code", code).maybeSingle();
  if (!mod) notFound();
  if (!staff.isManagement) {
    const { data: assigned } = await sb.from("module_lecturers").select("module_code").eq("module_code", code).eq("lecturer_id", staff.user.id).maybeSingle();
    if (!assigned || !staff.isLecturer) redirect("/admin/teaching");
  }

  const [{ data: rows }, { data: anns }, { data: people }, { data: comments }] = await Promise.all([
    sb.from("student_modules").select("student_id,students(full_name,student_no,status,archived_at)").eq("module_code", code),
    sb.from("announcements").select("id,title,body,posted_on,posted_by").eq("module_code", code).order("created_at", { ascending: false }).limit(20),
    sb.from("staff").select("user_id,full_name"),
    sb.from("messages").select("id,student_id,subject,body,category,created_at,sender_id,sender_name").eq("module_code", code).eq("audience", "student").order("created_at", { ascending: false }).limit(50),
  ]);
  const nameOf = (id: string | null) => (people ?? []).find((p) => p.user_id === id)?.full_name ?? "Staff";
  const students = ((rows ?? []) as unknown as Row[])
    .filter((r) => r.students && r.students.status !== "Withdrawn" && !r.students.archived_at)
    .sort((a, b) => a.students!.full_name.localeCompare(b.students!.full_name));

  return (
    <>
      <div className="ahead">
        <div>
          <p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/teaching">Teaching</Link> / <Link href={`/admin/teaching/${code}`}>{mod.code}</Link> / Messages</p>
          <h1>{mod.name}</h1>
          <p className="hint" style={{ marginTop: 4 }}>Comments to individual students and messages to the whole class.</p>
          <Link className="btn btn-navy btn-sm" style={{ marginTop: 12 }} href={`/admin/teaching/${code}`}>← Marks, classes &amp; notes</Link>
        </div>
      </div>

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
          <section className="rec">
          <div className="rec-h"><h2>Comment on a student</h2></div>
          <div className="rec-b" style={{ paddingBlock: 20 }}>
            <ActionForm action={sendStudentComment.bind(null, code)} submit="Send to student" resetOnSuccess>
              <div className="fgrid">
                <div className="field"><label htmlFor="sc-st">Student</label>
                  <select id="sc-st" name="student_id" defaultValue="">
                    <option value="" disabled>Choose…</option>
                    {students.map((r) => <option key={r.student_id} value={r.student_id}>{r.students!.full_name} · {r.students!.student_no}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="sc-cat">Type</label>
                  <select id="sc-cat" name="category" defaultValue="performance"><option value="performance">Performance comment / review</option><option value="message">General message</option></select>
                </div>
              </div>
              <div className="field"><label htmlFor="sc-subj">Title</label><input id="sc-subj" name="subject" placeholder="Mid-term progress" /></div>
              <div className="field"><label htmlFor="sc-body">Comment</label><textarea id="sc-body" name="body" placeholder="Strong on documentation; needs to revise tariff classification before the exam." /></div>
              <p className="hint">The student sees this in their portal. Management can read every comment.</p>
            </ActionForm>
          </div>
          <div className="rec-b" style={{ borderTop: "1px solid #F3F4F6" }}>
            {(comments ?? []).length === 0 && <p className="muted-row">No comments sent in this module yet.</p>}
            {(comments ?? []).map((c) => {
              const st = students.find((r) => r.student_id === c.student_id)?.students;
              return (
                <div className="row" key={c.id} style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <b>{c.category === "performance" && <span className="tag">Performance</span>}{c.subject}</b>
                    <small>To {st?.full_name ?? "student"} · from {c.sender_name ?? nameOf(c.sender_id)} · {fmtWhen(c.created_at)}</small>
                    <p className="abody">{c.body}</p>
                  </div>
                  {(staff.isManagement || c.sender_id === staff.user.id) && (
                    <form action={deleteMessage.bind(null, c.id)}><button className="del" type="submit">Delete</button></form>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rec">
          <div className="rec-h"><h2>Message your class</h2></div>
          <div className="rec-b" style={{ paddingBlock: 20 }}>
            <ActionForm action={postModuleAnnouncement.bind(null, code)} submit="Post to students" resetOnSuccess>
              <div className="field"><label htmlFor="m-title">Title</label><input id="m-title" name="title" placeholder="Test on Friday" /></div>
              <div className="field"><label htmlFor="m-body">Message</label><textarea id="m-body" name="body" /></div>
            </ActionForm>
          </div>
          <div className="rec-b" style={{ borderTop: "1px solid #F3F4F6" }}>
            {(anns ?? []).length === 0 && <p className="muted-row">No messages posted yet.</p>}
            {(anns ?? []).map((a) => (
              <div className="row" key={a.id} style={{ alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}><b>{a.title}</b><small>{a.posted_on} · {nameOf(a.posted_by)}</small><p className="abody">{a.body}</p></div>
                {(staff.isManagement || a.posted_by === staff.user.id) && (
                  <form action={deleteAnnouncement.bind(null, a.id)}><button className="del" type="submit">Delete</button></form>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
