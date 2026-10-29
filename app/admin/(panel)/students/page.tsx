import Link from "next/link";
import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { kwacha, managementPage, STATUSES } from "@/lib/admin";
import { remindAllOwing } from "../../actions";

const pillFor = (s: string) => (s === "Registered" || s === "Completed" ? "ok" : s === "Suspended" || s === "Withdrawn" ? "warn" : "wait");

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const { supabase } = await managementPage();
  let query = supabase.from("students").select("id,student_no,full_name,session,status,user_id,student_accounts(fees_balance)").order("student_no", { ascending: false });
  if (status) query = query.eq("status", status);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,student_no.ilike.%${term}%`);
  const { data, error } = await query;
  if (term && data?.length === 1 && data[0].student_no.toLowerCase() === term.toLowerCase()) redirect(`/admin/students/${data[0].id}`);

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Students</p><h1>{data?.length ?? 0} student{data?.length === 1 ? "" : "s"}</h1></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/students/fees" className="btn btn-navy btn-sm">Edit fees (all students)</Link>
          <Link href="/admin/students/import" className="btn btn-navy btn-sm">Import from spreadsheet</Link>
          <Link href="/admin/students/new" className="btn btn-orange btn-sm">+ Add student</Link>
        </div>
      </div>

      <details className="rec" style={{ marginBottom: 16 }}>
        <summary className="rec-h" style={{ cursor: "pointer" }}><h2 style={{ fontSize: "1rem" }}>Send balance reminders to all owing students</h2><span className="copy">Open</span></summary>
        <div className="rec-b" style={{ paddingBlock: 16 }}>
          <ActionForm action={remindAllOwing} submit="Send reminders now" variant="navy">
            <p className="hint">Texts every registered student with a balance and a phone number. Anyone already reminded in the last 24 hours is skipped. Each text costs SMS credit.</p>
          </ActionForm>
        </div>
      </details>

      <form className="filters" method="get">
        <input name="q" defaultValue={q} placeholder="Search name or ID (an exact ID opens the student)" aria-label="Search students" />
        <select name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-navy btn-sm" type="submit">Filter</button>
        {(q || status) && <Link className="copy" href="/admin/students">Clear</Link>}
      </form>

      {error && <div className="err">{error.message}</div>}
      <div className="tablewrap">
        <table className="table">
          <thead><tr><th>Student ID</th><th>Name</th><th>Session</th><th>Status</th><th className="num">Balance</th><th>Login</th></tr></thead>
          <tbody>
            {(data ?? []).map((s) => {
              const bal = Number((s.student_accounts as unknown as { fees_balance: number } | null)?.fees_balance ?? 0);
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
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="muted-row">{q || status ? "No students match that search." : "No students yet. Add the first one."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
