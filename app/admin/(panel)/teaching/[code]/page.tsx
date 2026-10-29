import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import GradeBadge from "@/components/GradeBadge";
import NoteUpload from "@/components/NoteUpload";
import { gradeFor, type GradeBand } from "@/lib/grades";
import { fmtWhen, getStaff, mark } from "@/lib/admin";
import { createClass, deleteClass, deleteNote, saveModuleMarks } from "../../../actions";

type Row = {
  student_id: string; status: string; ca_mark: number | null; exam_mark: number | null; final_mark: number | null;
  marks_updated_by: string | null; marks_updated_at: string | null;
  students: { full_name: string; student_no: string; status: string } | null;
};

const size = (b: number | null) => (!b ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default async function ModulePage({ params }: { params: Promise<{ code: string }> }) {
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

  const since = new Date(Date.now() - 2 * 3600e3).toISOString();
  const [{ data: rows }, { data: notes }, { data: classes }, { data: people }, { data: lecturers }, { data: scaleRows }] = await Promise.all([
    sb.from("student_modules").select("student_id,status,ca_mark,exam_mark,final_mark,marks_updated_by,marks_updated_at,students(full_name,student_no,status)").eq("module_code", code),
    sb.from("notes").select("id,title,file_path,file_name,file_size,created_at,uploaded_by").eq("module_code", code).order("created_at", { ascending: false }),
    sb.from("classes").select("id,title,starts_at,duration_min,meeting_url,details").eq("module_code", code).gte("starts_at", since).order("starts_at"),
    sb.from("staff").select("user_id,full_name"),
    sb.from("module_lecturers").select("lecturer_id").eq("module_code", code),
    sb.from("grade_scale").select("letter,min_mark,remark,is_pass"),
  ]);
  const scale = (scaleRows ?? []) as GradeBand[];

  const nameOf = (id: string | null) => (people ?? []).find((p) => p.user_id === id)?.full_name ?? "Staff";
  const students = ((rows ?? []) as unknown as Row[])
    .filter((r) => r.students && r.students.status !== "Withdrawn")
    .sort((a, b) => a.students!.student_no.localeCompare(b.students!.student_no));
  const graded = students.filter((r) => r.final_mark !== null);
  const avg = graded.length ? Math.round((graded.reduce((t, r) => t + Number(r.final_mark), 0) / graded.length) * 10) / 10 : null;

  const urls = new Map<string, string>();
  if ((notes ?? []).length) {
    const { data: signed } = await sb.storage.from("notes").createSignedUrls(notes!.map((n) => n.file_path), 3600);
    (signed ?? []).forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  const teacherNames = (lecturers ?? []).map((l) => nameOf(l.lecturer_id)).join(", ") || "No lecturer assigned";
  const now = new Date();
  const localNow = new Date(now.getTime() + 2 * 3600e3).toISOString().slice(0, 16);

  return (
    <>
      <div className="ahead">
        <div>
          <p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/teaching">Teaching</Link> / {mod.code}</p>
          <h1>{mod.name}</h1>
          <p className="hint" style={{ marginTop: 4 }}>Lecturer: {teacherNames}</p>
          <Link className="btn btn-navy btn-sm" style={{ marginTop: 12 }} href={`/admin/teaching/${code}/messages`}>Comments &amp; class messages →</Link>
        </div>
        <div className="bal">
          <span className="k">Class average</span>
          <span className="v">{avg === null ? "–" : `${avg}% · ${gradeFor(avg, scale)?.letter ?? ""}`}</span>
          {graded.length > 0 && <span className="hint">{graded.filter((r) => gradeFor(r.final_mark, scale)?.is_pass).length} of {graded.length} passed</span>}
        </div>
      </div>

      <section className="rec">
        <div className="rec-h">
          <h2>Marks</h2>
          <span className="hint" style={{ margin: 0 }}>Out of 100 · Final = CA 40% + Exam 60% · Status updates itself: Completed once CA and exam are both in</span>
        </div>
        <div className="rec-b" style={{ paddingBlock: 12 }}>
          {students.length === 0 ? (
            <p className="muted-row">No students are enrolled yet.</p>
          ) : (
            <ActionForm action={saveModuleMarks.bind(null, code)} submit="Save marks">
              <div className="tablewrap flat">
                <table className="table marks-table">
                  <thead><tr><th>Student</th><th>Status</th><th className="num">CA</th><th className="num">Exam</th><th className="num">Final</th><th className="num">Grade</th></tr></thead>
                  <tbody>
                    {students.map((r) => (
                      <tr key={r.student_id}>
                        <td>
                          <input type="hidden" name="sid" value={r.student_id} />
                          <input type="hidden" name={`name_${r.student_id}`} value={r.students!.full_name} />
                          <b>{r.students!.full_name}</b>
                          <small className="sub">{r.students!.student_no}{r.marks_updated_at ? ` · edited by ${nameOf(r.marks_updated_by)}, ${new Date(r.marks_updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lusaka" })}` : ""}</small>
                        </td>
                        <td><span className={`pill ${r.status === "Completed" ? "ok" : "warn"}`}>{r.status === "Not started" ? "In progress" : r.status}</span></td>
                        <td className="num"><input name={`ca_${r.student_id}`} defaultValue={r.ca_mark ?? ""} inputMode="decimal" placeholder="–" aria-label={`${r.students!.full_name} CA`} /></td>
                        <td className="num"><input name={`exam_${r.student_id}`} defaultValue={r.exam_mark ?? ""} inputMode="decimal" placeholder="–" aria-label={`${r.students!.full_name} exam`} /></td>
                        <td className="num final">{mark(r.final_mark)}</td>
                        <td className="num"><GradeBadge grade={gradeFor(r.final_mark, scale)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ActionForm>
          )}
        </div>
      </section>

      <div className="grid2" style={{ gap: 24, marginTop: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>Schedule a class</h2></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <ActionForm action={createClass.bind(null, code)} submit="Schedule class" resetOnSuccess>
                <div className="field"><label htmlFor="c-title">Topic</label><input id="c-title" name="title" placeholder="Week 3: Customs valuation" /></div>
                <div className="fgrid">
                  <div className="field"><label htmlFor="c-when">Date and start time</label><input id="c-when" name="starts_at" type="datetime-local" min={localNow} /></div>
                  <div className="field"><label htmlFor="c-dur">Length</label>
                    <select id="c-dur" name="duration_min" defaultValue="60">
                      <option value="30">30 minutes</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option>
                    </select>
                  </div>
                </div>
                <div className="field"><label htmlFor="c-url">Google Meet or Zoom link</label><input id="c-url" name="meeting_url" type="url" placeholder="https://meet.google.com/…" /></div>
                <div className="field"><label htmlFor="c-det">Notes for students (optional)</label><input id="c-det" name="details" placeholder="Read Week 2 notes before class" /></div>
              </ActionForm>
            </div>
          </section>

          <section className="rec">
            <div className="rec-h"><h2>Upcoming classes</h2></div>
            <div className="rec-b">
              {(classes ?? []).length === 0 && <p className="muted-row">Nothing scheduled.</p>}
              {(classes ?? []).map((c) => (
                <div className="row" key={c.id} style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <b>{c.title}</b>
                    <small>{fmtWhen(c.starts_at)} · {c.duration_min} min</small>
                    {c.details && <p className="abody">{c.details}</p>}
                  </div>
                  <div className="row-actions">
                    {c.meeting_url && <a className="btn btn-sm btn-orange" href={c.meeting_url} target="_blank" rel="noreferrer">Start</a>}
                    <form action={deleteClass.bind(null, c.id)}><button className="del" type="submit">Cancel</button></form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>Notes</h2></div>
            <div className="rec-b" style={{ paddingBlock: 20 }}>
              <NoteUpload code={code} />
            </div>
            <div className="rec-b" style={{ borderTop: "1px solid #F3F4F6" }}>
              {(notes ?? []).length === 0 && <p className="muted-row">No notes uploaded yet.</p>}
              {(notes ?? []).map((n) => (
                <div className="row" key={n.id}>
                  <div style={{ minWidth: 0 }}>
                    <b>{n.title}</b>
                    <small>{n.file_name} · {size(n.file_size)} · {nameOf(n.uploaded_by)}</small>
                  </div>
                  <div className="row-actions">
                    {urls.get(n.file_path) && <a className="copy" href={urls.get(n.file_path)} target="_blank" rel="noreferrer">Open</a>}
                    {(staff.isManagement || n.uploaded_by === staff.user.id) && (
                      <form action={deleteNote.bind(null, n.id)}><button className="del" type="submit">Delete</button></form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
