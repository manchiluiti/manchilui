import GradeBadge from "@/components/GradeBadge";
import { gradeFor, type GradeBand } from "@/lib/grades";
import { myModules, pct, requirePortalStudent } from "@/lib/portal";

export const metadata = { title: "Results" };
const pill = (s: string) => (s === "Completed" ? "ok" : "warn");

export default async function PortalResults() {
  const { supabase, student } = await requirePortalStudent();
  const [modules, { data: scaleRows }] = await Promise.all([
    myModules(supabase, student.id),
    supabase.from("grade_scale").select("letter,min_mark,remark,is_pass").order("min_mark", { ascending: false }),
  ]);
  const scale = (scaleRows ?? []) as GradeBand[];
  const done = modules.filter((m) => m.status === "Completed").length;

  return (
    <div className="rec">
      <div className="rec-h"><h2>Results</h2><span style={{ fontSize: ".85rem", color: "var(--muted)" }}>{done} of {modules.length} completed</span></div>
      <div className="prog"><span style={{ width: `${modules.length ? (done / modules.length) * 100 : 0}%` }} /></div>
      <div className="rec-b" style={{ overflowX: "auto" }}>
        <table className="results">
          <thead><tr><th>Module</th><th className="num">CA</th><th className="num">Exam</th><th className="num">Final</th><th className="num">Grade</th></tr></thead>
          <tbody>
            {modules.map((m) => {
              const st = m.status === "Completed" ? "Completed" : "In progress";
              return (
                <tr key={m.module_code}>
                  <td><span className="code">{m.module_code}</span>{m.modules.name}<br /><span className={`pill ${pill(st)}`} style={{ marginTop: 4 }}>{st}</span></td>
                  <td className="num">{pct(m.ca_mark)}</td>
                  <td className="num">{pct(m.exam_mark)}</td>
                  <td className="num final">{pct(m.final_mark)}</td>
                  <td className="num"><GradeBadge grade={gradeFor(m.final_mark, scale)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint" style={{ padding: "10px 0 6px" }}>Final mark = CA 40% + Exam 60%. Grades: {scale.map((g) => `${g.letter} ${Number(g.min_mark)}+`).join(", ")}. Pass mark {Number(scale.filter((g) => g.is_pass).at(-1)?.min_mark ?? 40)}%.</p>
      </div>
    </div>
  );
}
