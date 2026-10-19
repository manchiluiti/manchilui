import Link from "next/link";
import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { fmtWhen, getStaff, myModules } from "@/lib/admin";
import { saveGradeScale } from "../../actions";

export default async function Teaching() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const mods = await myModules(staff);
  const codes = mods.map((m) => m.code);

  const [{ data: classes }, { data: notes }] = codes.length
    ? await Promise.all([
        staff.supabase.from("classes").select("id,module_code,title,starts_at,meeting_url").in("module_code", codes).gte("starts_at", new Date(Date.now() - 2 * 3600e3).toISOString()).order("starts_at").limit(6),
        staff.supabase.from("notes").select("module_code").in("module_code", codes),
      ])
    : [{ data: [] }, { data: [] }];

  const { data: scale } = await staff.supabase.from("grade_scale").select("letter,min_mark,remark,is_pass").order("min_mark", { ascending: false });
  const rows = [...(scale ?? []), { letter: "", min_mark: "", remark: "", is_pass: false }];

  const noteCount = (c: string) => (notes ?? []).filter((n) => n.module_code === c).length;
  const first = staff.name.split(" ")[0];

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Teaching</p><h1>{staff.isManagement ? "All modules" : `Your modules, ${first}`}</h1></div>
      </div>

      {mods.length === 0 && (
        <div className="rec"><p className="muted-row" style={{ padding: 24 }}>You haven&apos;t been assigned to any modules yet. Ask management to assign you on the Staff page.</p></div>
      )}

      <div className="grid3" style={{ gap: 20 }}>
        {mods.map((m) => (
          <Link key={m.code} href={`/admin/teaching/${m.code}`} className="fcard">
            <span className="mcode">{m.code}</span>
            <h3 style={{ fontSize: "1.2rem" }}>{m.name}</h3>
            <p>{noteCount(m.code)} note{noteCount(m.code) === 1 ? "" : "s"} · {(classes ?? []).filter((c) => c.module_code === m.code).length} upcoming class{(classes ?? []).filter((c) => c.module_code === m.code).length === 1 ? "" : "es"}</p>
            <span className="more">Open module →</span>
          </Link>
        ))}
      </div>

      {codes.length > 0 && (
        <section className="rec" style={{ marginTop: 24 }}>
          <div className="rec-h"><h2>Upcoming classes</h2></div>
          <div className="rec-b">
            {(classes ?? []).length === 0 && <p className="muted-row">No classes scheduled. Open a module to schedule one.</p>}
            {(classes ?? []).map((c) => (
              <div className="row" key={c.id}>
                <div><b>{c.title}</b><small>{c.module_code} · {fmtWhen(c.starts_at)}</small></div>
                {c.meeting_url && <a className="btn btn-sm btn-orange" href={c.meeting_url} target="_blank" rel="noreferrer">Start</a>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rec" style={{ marginTop: 24, maxWidth: 720 }}>
        <div className="rec-h"><h2>Grading scale</h2><span className="hint" style={{ margin: 0 }}>Final mark = CA 40% + Exam 60%</span></div>
        <div className="rec-b" style={{ paddingBlock: 16 }}>
          {staff.isManagement ? (
            <ActionForm action={saveGradeScale} submit="Save grading scale" variant="navy">
              <div className="scale">
                <div className="scale-row scale-head"><span>Grade</span><span>From (%)</span><span>Remark</span><span>Pass</span></div>
                {rows.map((g, i) => (
                  <div className="scale-row" key={i}>
                    <input name="letter" defaultValue={g.letter} placeholder={g.letter ? "" : "New"} aria-label="Grade letter" />
                    <input name="min_mark" defaultValue={g.min_mark === "" ? "" : Number(g.min_mark)} inputMode="decimal" aria-label="Minimum mark" />
                    <input name="remark" defaultValue={g.remark} aria-label="Remark" />
                    <label><input type="checkbox" name={`pass_${i}`} defaultChecked={g.is_pass} /> Pass</label>
                  </div>
                ))}
              </div>
              <p className="hint">Each grade starts at its minimum mark and runs up to the next one. Clear a letter to remove that grade; use the empty row to add one.</p>
            </ActionForm>
          ) : (
            <div className="scale">
              {(scale ?? []).map((g) => (
                <div className="row" key={g.letter}><div><b>{g.letter}</b><small>{Number(g.min_mark)}% and above · {g.remark}</small></div></div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
