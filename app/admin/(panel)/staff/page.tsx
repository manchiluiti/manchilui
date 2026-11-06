import ActionForm from "@/components/ActionForm";
import { currentIntakes, managementPage } from "@/lib/admin";
import { createStaff, deleteStaff, removeStaffAccess, setStaffPassword, updateStaff } from "../../actions";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import PasswordInput from "@/components/PasswordInput";

export default async function StaffPage() {
  const me = await managementPage();
  const sb = me.supabase;
  const [{ data: staff }, { data: mods }, { data: assigns }] = await Promise.all([
    sb.from("staff").select("user_id,full_name,email,is_management,is_lecturer").order("full_name"),
    sb.from("modules").select("code,name").order("sort"),
    sb.from("module_lecturers").select("module_code,lecturer_id,session"),
  ]);
  const intakes = await currentIntakes(sb);
  // Columns: each current intake. An old "all intakes" assignment shows ticked in every column.
  const cols = intakes.length ? intakes : ["*"];
  const chosenFor = (id: string) => {
    const set = new Set<string>();
    for (const a of (assigns ?? []).filter((x) => x.lecturer_id === id)) {
      if (a.session === null) cols.forEach((c) => set.add(`${a.module_code}|${c}`));
      else set.add(`${a.module_code}|${a.session}`);
    }
    return set;
  };
  const covered = (code: string, intake: string) => (assigns ?? []).some((a) => a.module_code === code && (a.session === null || a.session === intake));
  const gaps = (mods ?? []).flatMap((m) => cols.filter((c) => c !== "*" && !covered(m.code, c)).map((c) => `${m.code} (${c})`));
  const unassigned = intakes.length ? gaps : (mods ?? []).filter((m) => !(assigns ?? []).some((a) => a.module_code === m.code)).map((m) => m.code);

  const ModulePicker = ({ chosen }: { chosen: Set<string> }) => (
    <fieldset className="checks">
      <legend>Modules they teach, by intake</legend>
      <div className="assign-grid" style={{ gridTemplateColumns: `minmax(160px, 1fr) repeat(${cols.length}, minmax(84px, auto))` }}>
        <span />
        {cols.map((c) => <span key={c} className="assign-head">{c === "*" ? "All intakes" : c}</span>)}
        {(mods ?? []).map((m) => (
          <div key={m.code} style={{ display: "contents" }}>
            <span className="assign-mod"><span className="code">{m.code}</span> {m.name}</span>
            {cols.map((c) => (
              <label key={c} className="assign-cell" title={`${m.code} · ${c === "*" ? "All intakes" : c}`}>
                <input type="checkbox" name="assign" value={`${m.code}|${c}`} defaultChecked={chosen.has(`${m.code}|${c}`)} aria-label={`${m.code} for ${c === "*" ? "all intakes" : c}`} />
              </label>
            ))}
          </div>
        ))}
      </div>
      {intakes.length > 1 && <p className="hint">Tick the intake(s) this lecturer teaches each module for. Another lecturer can take the same module for a different intake.</p>}
    </fieldset>
  );

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Staff</p><h1>Staff and roles</h1></div>
      </div>

      <div className="rolekey">
        <div><b>Management</b> sees everything: students, fees, payments, enrolment, enquiries, staff, and can change any mark.</div>
        <div><b>Lecturer</b> sees only their modules: class list (names and IDs), marks, notes, classes and class messages. No fees or contact details.</div>
      </div>
      {unassigned.length > 0 && (
        <div className="warnbox">No lecturer assigned yet: {unassigned.join(", ")}</div>
      )}

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 20 }}>
          {(staff ?? []).map((s) => {
            const noAccess = !s.is_management && !s.is_lecturer;
            const roles = [s.is_management && "Management", s.is_lecturer && "Lecturer"].filter(Boolean).join(" · ") || "No access";
            return (
              <details className="rec staffcard" key={s.user_id}>
                <summary className="rec-h">
                  <div><h2>{s.full_name}{s.user_id === me.user.id ? " (you)" : ""}</h2><small className="sub">{s.email}</small></div>
                  <span className={`pill ${noAccess ? "wait" : s.is_management ? "warn" : "ok"}`}>{roles}</span>
                </summary>
                <div className="rec-b" style={{ paddingBlock: 20, display: "grid", gap: 20 }}>
                  <ActionForm action={updateStaff.bind(null, s.user_id)} submit="Save" variant="navy">
                    <div className="field"><label htmlFor={`fn-${s.user_id}`}>Full name</label><input id={`fn-${s.user_id}`} name="full_name" defaultValue={s.full_name} /></div>
                    <div className="checks inline">
                      <label><input type="checkbox" name="is_management" defaultChecked={s.is_management} /> Management</label>
                      <label><input type="checkbox" name="is_lecturer" defaultChecked={s.is_lecturer} /> Lecturer</label>
                    </div>
                    <ModulePicker chosen={chosenFor(s.user_id)} />
                  </ActionForm>
                  <ActionForm action={setStaffPassword.bind(null, s.user_id)} submit="Change password" variant="navy" resetOnSuccess>
                    <div className="field"><label htmlFor={`pw-${s.user_id}`}>New password</label><PasswordInput id={`pw-${s.user_id}`} name="password" autoComplete="new-password" placeholder="At least 8 characters" /></div>
                  </ActionForm>
                  {s.user_id !== me.user.id && (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      {!noAccess && (
                        <form action={removeStaffAccess.bind(null, s.user_id)}>
                          <button className="del" type="submit">Remove all access (keeps their records)</button>
                        </form>
                      )}
                      <ConfirmDeleteButton
                        action={deleteStaff.bind(null, s.user_id)}
                        label="Delete staff member"
                        confirmText={`Delete ${s.full_name}?\n\nThis permanently removes their login, module allocations and unpaid payslips. It can't be undone.`}
                      />
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>

        <section className="rec">
          <div className="rec-h"><h2>Add a staff member</h2></div>
          <div className="rec-b" style={{ paddingBlock: 20 }}>
            <ActionForm action={createStaff} submit="Create staff login" resetOnSuccess>
              <div className="field"><label htmlFor="s-name">Full name</label><input id="s-name" name="full_name" /></div>
              <div className="field"><label htmlFor="s-email">Email (used to sign in)</label><input id="s-email" name="email" type="email" autoComplete="off" /></div>
              <div className="field"><label htmlFor="s-pw">Password</label><PasswordInput id="s-pw" name="password" autoComplete="new-password" placeholder="At least 8 characters" /></div>
              <div className="checks inline">
                <label><input type="checkbox" name="is_management" /> Management</label>
                <label><input type="checkbox" name="is_lecturer" defaultChecked /> Lecturer</label>
              </div>
              <ModulePicker chosen={new Set()} />
              <p className="hint">They sign in at /admin. Tick both roles for managers who also lecture.</p>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  );
}
