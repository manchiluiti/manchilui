import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { kwacha, managementPage } from "@/lib/admin";
import { archiveIntake, renameIntake, restoreIntake } from "../../../actions";

type Group = { session: string; total: number; current: number; archived: number; owing: number; owed: number; registered: number };

export default async function IntakesPage() {
  const { supabase } = await managementPage();
  const { data } = await supabase.from("students").select("session,status,archived_at,created_at,student_accounts(fees_balance)").order("created_at");
  const map = new Map<string, Group>();
  for (const s of data ?? []) {
    const g = map.get(s.session) ?? { session: s.session, total: 0, current: 0, archived: 0, owing: 0, owed: 0, registered: 0 };
    const bal = Number((s.student_accounts as unknown as { fees_balance: number } | null)?.fees_balance ?? 0);
    g.total++;
    if (s.archived_at) g.archived++; else g.current++;
    if (bal > 0) { g.owing++; g.owed += bal; }
    if (s.status === "Registered") g.registered++;
    map.set(s.session, g);
  }
  const groups = [...map.values()];
  const current = groups.filter((g) => g.current > 0);
  const archived = groups.filter((g) => g.current === 0);

  const card = (g: Group) => (
    <section className="rec" key={g.session}>
      <div className="rec-h">
        <div><h2>{g.session}</h2><small className="sub">{g.total} student{g.total === 1 ? "" : "s"}{g.archived && g.current ? ` · ${g.current} current, ${g.archived} archived` : ""}</small></div>
        <span className={`pill ${g.current ? "ok" : "wait"}`}>{g.current ? "Current" : "Archived"}</span>
      </div>
      <div className="rec-b" style={{ paddingBlock: 16, display: "grid", gap: 14 }}>
        <div className="kv"><span className="k">Still owing</span><span className="v" style={{ color: g.owing ? "var(--warn)" : "var(--ok)" }}>{g.owing ? `${kwacha(g.owed)} · ${g.owing} student${g.owing === 1 ? "" : "s"}` : "Nobody"}</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Link className="btn btn-outline btn-sm" href={`/admin/students?view=${g.current ? "current" : "archived"}&intake=${encodeURIComponent(g.session)}`}>View students</Link>
          <a className="btn btn-outline btn-sm" href={`/admin/students/intakes/export?session=${encodeURIComponent(g.session)}`}>Download CSV</a>
          {g.current > 0 && <ActionForm action={archiveIntake.bind(null, g.session)} submit={`Archive ${g.session}`} variant="navy" className="inline-form"><span /></ActionForm>}
          {g.archived > 0 && <ActionForm action={restoreIntake.bind(null, g.session)} submit="Restore to current" variant="navy" className="inline-form"><span /></ActionForm>}
        </div>
        <details>
          <summary className="copy" style={{ cursor: "pointer" }}>Rename this intake</summary>
          <div style={{ paddingTop: 12 }}>
            <ActionForm action={renameIntake.bind(null, g.session)} submit="Rename" variant="navy">
              <div className="field"><label htmlFor={`rn-${g.session}`}>New name</label><input id={`rn-${g.session}`} name="session" defaultValue={g.session} /></div>
              <p className="hint">Use this to tidy names, e.g. to merge &ldquo;July – December 2026&rdquo; into &ldquo;June 2026 intake&rdquo;. Type an existing intake&apos;s exact name to merge them.</p>
            </ActionForm>
          </div>
        </details>
      </div>
    </section>
  );

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/students">Students</Link> / Intakes</p><h1>Intakes</h1></div>
      </div>
      <p className="hint" style={{ marginBottom: 20, maxWidth: 780 }}>
        When an intake finishes, archive it. Its students leave the everyday lists (Students, Teaching, Fees, Messages) but nothing is deleted: results, payments and logins stay.
        Archived students can still sign in to view their results and fees. Anyone still owing appears under <Link className="copy" href="/admin/students?view=owing">Archived with balance</Link>, where you can record payments and send reminders.
        Download the CSV before archiving if you want a copy for your own files.
      </p>
      <h2 className="subhead" style={{ marginBottom: 12 }}>Current</h2>
      <div className="grid2" style={{ gap: 20, alignItems: "start", marginBottom: 32 }}>
        {current.length ? current.map(card) : <p className="muted-row">No current intakes.</p>}
      </div>
      <h2 className="subhead" style={{ marginBottom: 12 }}>Archived</h2>
      <div className="grid2" style={{ gap: 20, alignItems: "start" }}>
        {archived.length ? archived.map(card) : <p className="muted-row">Nothing archived yet.</p>}
      </div>
    </>
  );
}
