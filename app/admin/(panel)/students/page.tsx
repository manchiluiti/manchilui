import Link from "next/link";
import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { kwacha, managementPage, STATUSES } from "@/lib/admin";
import { remindAllOwing } from "../../actions";

const pillFor = (s: string) => (s === "Registered" || s === "Completed" ? "ok" : s === "Suspended" || s === "Withdrawn" ? "warn" : "wait");

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; deleted?: string; view?: string; intake?: string }> }) {
  const { q = "", status = "", deleted, view: rawView = "current", intake = "" } = await searchParams;
  const view = rawView === "archived" || rawView === "owing" ? rawView : "current";
  const { supabase } = await managementPage();
  let query = supabase.from("students").select("id,student_no,full_name,session,status,user_id,archived_at,student_accounts(fees_balance)").order("student_no", { ascending: false });
  query = view === "current" ? query.is("archived_at", null) : query.not("archived_at", "is", null);
  if (status) query = query.eq("status", status);
  if (intake) query = query.eq("session", intake);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,student_no.ilike.%${term}%`);
  const { data: found, error } = await query;
  const balOf = (s: { student_accounts: unknown }) => Number((s.student_accounts as { fees_balance: number } | null)?.fees_balance ?? 0);
  const data = view === "owing" ? (found ?? []).filter((s) => balOf(s) > 0) : found;
  // An exact ID search finds the student even if their intake is archived.
  if (term && !data?.length) {
    const { data: any1 } = await supabase.from("students").select("id").ilike("student_no", term).maybeSingle();
    if (any1) redirect(`/admin/students/${any1.id}`);
  }
  if (term && data?.length === 1 && data[0].student_no.toLowerCase() === term.toLowerCase()) redirect(`/admin/students/${data[0].id}`);

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Students</p><h1>{data?.length ?? 0} {view === "current" ? "current" : view === "owing" ? "archived owing" : "archived"} student{data?.length === 1 ? "" : "s"}</h1></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/students/intakes" className="btn btn-navy btn-sm">Intakes &amp; archive</Link>
          <Link href="/admin/students/fees" className="btn btn-navy btn-sm">Edit fees (current students)</Link>
          <Link href="/admin/students/import" className="btn btn-navy btn-sm">Import from spreadsheet</Link>
          <Link href="/admin/students/new" className="btn btn-orange btn-sm">+ Add student</Link>
        </div>
      </div>

      {deleted && <div className="ok-msg" style={{ marginBottom: 16 }}>{deleted} was deleted, along with their portal login.</div>}

      <details className="rec" style={{ marginBottom: 16 }}>
        <summary className="rec-h" style={{ cursor: "pointer" }}><h2 style={{ fontSize: "1rem" }}>Send balance reminders to all owing students</h2><span className="copy">Open</span></summary>
        <div className="rec-b" style={{ paddingBlock: 16 }}>
          <ActionForm action={remindAllOwing} submit="Send reminders now" variant="navy">
            <p className="hint">Texts every registered student with a balance and a phone number. Anyone already reminded in the last 24 hours is skipped. Each text costs SMS credit.</p>
          </ActionForm>
        </div>
      </details>

      <nav className="seg" aria-label="Which students">
        {([["current", "Current"], ["archived", "Archived"], ["owing", "Archived with balance"]] as const).map(([v, label]) => (
          <Link key={v} href={`/admin/students?view=${v}`} className={view === v ? "on" : ""}>{label}</Link>
        ))}
      </nav>
      {intake && <p className="hint" style={{ marginBottom: 12 }}>Showing intake: <b>{intake}</b> · <Link className="copy" href={`/admin/students?view=${view}`}>Show all intakes</Link></p>}

      <form className="filters" method="get">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={q} placeholder="Search name or ID (an exact ID opens the student)" aria-label="Search students" />
        <select name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-navy btn-sm" type="submit">Filter</button>
        {(q || status) && <Link className="copy" href={`/admin/students?view=${view}`}>Clear</Link>}
      </form>

      {error && <div className="err">{error.message}</div>}
      <div className="tablewrap">
        <table className="table">
          <thead><tr><th>Student ID</th><th>Name</th><th>Session</th><th>Status</th><th className="num">Balance</th><th>Login</th></tr></thead>
          <tbody>
            {(data ?? []).map((s) => {
              const bal = balOf(s);
              return (
              <tr key={s.id} className="rowlink">
                {[
                  <span key="id" className="idlink">{s.student_no}</span>,
                  <span key="n">{s.full_name}</span>,
                  <span key="se">{s.session}</span>,
                  <span key="st" className={`pill ${pillFor(s.status)}`}>{s.status}</span>,
                  <span key="b" style={{ color: bal > 0 ? "var(--warn)" : "var(--ok)" }}>{bal > 0 ? kwacha(bal) : "Paid"}</span>,
                  s.user_id ? <span key="l">✓</span> : <span key="l" style={{ color: "var(--warn)" }}>None</span>,
                ].map((content, i) => (
                  <td key={i} className={i === 4 ? "num" : undefined}>
                    <Link href={`/admin/students/${s.id}`} className="cell-link" tabIndex={i === 0 ? 0 : -1} aria-label={i === 0 ? `Open ${s.full_name}` : undefined}>{content}</Link>
                  </td>
                ))}
              </tr>
              );
            })}
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="muted-row">{q || status ? "No students match that search." : view === "current" ? "No current students. Add one, or check the Archived tab." : view === "owing" ? "No archived student owes anything." : "Nothing archived yet. Archive a finished intake from Intakes & archive."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
