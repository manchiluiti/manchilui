import Link from "next/link";
import { notFound } from "next/navigation";
import GradeBadge from "@/components/GradeBadge";
import Logo from "@/components/Logo";
import PrintButton from "@/components/PrintButton";
import { managementPage } from "@/lib/admin";
import { gradeFor, type GradeBand } from "@/lib/grades";
import { SITE } from "@/lib/site";

type Row = { module_code: string; ca_mark: number | null; exam_mark: number | null; final_mark: number | null; modules: { name: string; sort: number } };
const pct = (n: number | null) => (n === null ? "–" : `${Number(n)}%`);

export default async function Statement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const { data: settings } = await supabase.from("app_settings").select("results_statement_enabled").maybeSingle();

  if (!settings?.results_statement_enabled) {
    return (
      <div className="rec" style={{ maxWidth: 640 }}>
        <div className="rec-h"><h2>Statement of results</h2><span className="pill wait">Frozen</span></div>
        <div className="rec-b" style={{ paddingBlock: 20, display: "grid", gap: 12 }}>
          <p>This feature is built but switched off for now. Management can turn it on in Settings when the school is ready to issue statements.</p>
          <Link className="copy" href={`/admin/students/${id}`}>← Back to student</Link>
        </div>
      </div>
    );
  }

  const [{ data: s }, { data: mods }, { data: scaleRows }] = await Promise.all([
    supabase.from("students").select("student_no,full_name,programme,session,status").eq("id", id).maybeSingle(),
    supabase.from("student_modules").select("module_code,ca_mark,exam_mark,final_mark,modules(name,sort)").eq("student_id", id),
    supabase.from("grade_scale").select("letter,min_mark,remark,is_pass"),
  ]);
  if (!s) notFound();
  const scale = (scaleRows ?? []) as GradeBand[];
  const rows = ((mods ?? []) as unknown as Row[]).sort((a, b) => a.modules.sort - b.modules.sort);
  const graded = rows.filter((r) => r.final_mark !== null);
  const avg = graded.length ? Math.round((graded.reduce((t, r) => t + Number(r.final_mark), 0) / graded.length) * 10) / 10 : null;
  const allPassed = graded.length === rows.length && rows.length > 0 && graded.every((r) => gradeFor(r.final_mark, scale)?.is_pass);
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lusaka" });

  return (
    <div className="payslip-wrap">
      <div className="noprint" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><PrintButton label="Print statement" /></div>
      <article className="payslip">
        <header>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Logo size={56} />
            <div><b className="ps-name">{SITE.name}</b><small>{SITE.address}</small></div>
          </div>
          <div className="ps-title"><span>Statement of results</span><b>{s.student_no}</b></div>
        </header>
        <div className="ps-grid">
          <div><span>Name</span><b>{s.full_name}</b></div>
          <div><span>Programme</span><b>{s.programme}</b></div>
          <div><span>Session</span><b>{s.session}</b></div>
          <div><span>Date issued</span><b>{today}</b></div>
        </div>
        <table className="ps-table">
          <thead><tr><th style={{ textAlign: "left" }}>Module</th><th className="num">CA</th><th className="num">Exam</th><th className="num">Final</th><th className="num">Grade</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.module_code}>
                <td>{r.module_code} · {r.modules.name}</td>
                <td className="num">{pct(r.ca_mark)}</td>
                <td className="num">{pct(r.exam_mark)}</td>
                <td className="num">{pct(r.final_mark)}</td>
                <td className="num"><GradeBadge grade={gradeFor(r.final_mark, scale)} /></td>
              </tr>
            ))}
            <tr className="net"><td>Average</td><td /><td /><td className="num">{avg === null ? "–" : `${avg}%`}</td><td className="num">{gradeFor(avg, scale)?.letter ?? ""}</td></tr>
          </tbody>
        </table>
        <p className="ps-note">Final = CA 40% + Exam 60%. Overall: {allPassed ? "all modules passed" : graded.length < rows.length ? "results incomplete" : "not all modules passed"}.</p>
        <div className="sigs"><div><span /><small>The Director</small></div><div><span /><small>Stamp</small></div></div>
      </article>
    </div>
  );
}
