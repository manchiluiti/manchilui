import { myModules, requirePortalStudent } from "@/lib/portal";

export const metadata = { title: "Notes" };

export default async function PortalNotes() {
  const { supabase, student } = await requirePortalStudent();
  const [modules, { data: notes }] = await Promise.all([
    myModules(supabase, student.id),
    supabase.from("notes").select("id,module_code,title,file_path,file_name,created_at").order("created_at", { ascending: false }),
  ]);
  const urls = new Map<string, string>();
  if ((notes ?? []).length) {
    const { data: signed } = await supabase.storage.from("notes").createSignedUrls(notes!.map((n) => n.file_path), 3600);
    (signed ?? []).forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  const groups = modules
    .map((m) => ({ code: m.module_code, name: m.modules.name, items: (notes ?? []).filter((n) => n.module_code === m.module_code) }))
    .filter((g) => g.items.length);
  return (
    <div className="rec">
      <div className="rec-h"><h2>Notes</h2></div>
      <div className="rec-b">
        {groups.length === 0 && <p className="muted-row">Your lecturers haven&apos;t uploaded notes yet.</p>}
        {groups.map((g) => (
          <div className="notegroup" key={g.code}>
            <h3>{g.code} · {g.name}</h3>
            {g.items.map((n) => (
              <div className="row" key={n.id}>
                <div style={{ minWidth: 0 }}><b>{n.title}</b><small>{n.file_name}</small></div>
                {urls.get(n.file_path) && <a className="btn btn-sm btn-navy" href={urls.get(n.file_path)} target="_blank" rel="noreferrer">Download</a>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
