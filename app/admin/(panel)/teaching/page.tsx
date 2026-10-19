import Link from "next/link";
import { redirect } from "next/navigation";
import { fmtWhen, getStaff, myModules } from "@/lib/admin";

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
    </>
  );
}
