import ActionForm from "@/components/ActionForm";
import { managementPage } from "@/lib/admin";
import { addModule, removeModule, saveModule } from "../../actions";

export default async function ModulesPage() {
  const { supabase } = await managementPage();
  const [{ data: mods }, { data: assigns }, { data: staff }] = await Promise.all([
    supabase.from("modules").select("code,name,sort").order("sort"),
    supabase.from("module_lecturers").select("module_code,lecturer_id"),
    supabase.from("staff").select("user_id,full_name"),
  ]);
  const lecturers = (code: string) =>
    (assigns ?? []).filter((a) => a.module_code === code).map((a) => (staff ?? []).find((s) => s.user_id === a.lecturer_id)?.full_name).filter(Boolean).join(", ");

  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Modules</p><h1>{(mods ?? []).length} modules</h1></div></div>
      <p className="hint" style={{ marginBottom: 20, maxWidth: 760 }}>
        Every student takes every module. Change a name, code or order and click Save; marks, notes, classes and lecturer assignments follow the new code. The website&apos;s module count updates automatically.
      </p>

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          {(mods ?? []).map((m) => (
            <details className="rec staffcard" key={m.code}>
              <summary className="rec-h">
                <div><h2><span className="mcode" style={{ marginRight: 8 }}>{m.code}</span>{m.name}</h2><small className="sub">{lecturers(m.code) || "No lecturer assigned"}</small></div>
                <span className="copy">Edit</span>
              </summary>
              <div className="rec-b" style={{ paddingBlock: 20, display: "grid", gap: 16 }}>
                <ActionForm action={saveModule.bind(null, m.code)} submit="Save" variant="navy">
                  <div className="fgrid">
                    <div className="field"><label htmlFor={`c-${m.code}`}>Code</label><input id={`c-${m.code}`} name="code" defaultValue={m.code} autoCapitalize="characters" /></div>
                    <div className="field"><label htmlFor={`o-${m.code}`}>Order</label><input id={`o-${m.code}`} name="sort" inputMode="numeric" defaultValue={String(m.sort)} /></div>
                    <div className="field full"><label htmlFor={`n-${m.code}`}>Name</label><input id={`n-${m.code}`} name="name" defaultValue={m.name} /></div>
                  </div>
                </ActionForm>
                <ActionForm action={removeModule.bind(null, m.code)} submit={`Remove ${m.code}`} variant="navy" className="inline-form" ><p className="hint">Only possible if no marks or notes exist for it yet.</p></ActionForm>
              </div>
            </details>
          ))}
        </div>

        <section className="rec">
          <div className="rec-h"><h2>Add a module</h2></div>
          <div className="rec-b" style={{ paddingBlock: 20 }}>
            <ActionForm action={addModule} submit="Add module" resetOnSuccess>
              <div className="field"><label htmlFor="am-code">Code</label><input id="am-code" name="code" placeholder="CF108" autoCapitalize="characters" /></div>
              <div className="field"><label htmlFor="am-name">Name</label><input id="am-name" name="name" placeholder="Freight Insurance" /></div>
              <p className="hint">It&apos;s added to every student as Not started, at the end of the list.</p>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  );
}
