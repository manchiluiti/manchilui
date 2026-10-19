import Link from "next/link";
import { kwacha, managementPage, STATUSES } from "@/lib/admin";

const pillFor = (s: string) => (s === "Registered" || s === "Completed" ? "ok" : s === "Suspended" || s === "Withdrawn" ? "warn" : "wait");

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const { supabase } = await managementPage();
  let query = supabase.from("students").select("id,student_no,full_name,session,status,user_id,student_accounts(fees_balance)").order("student_no", { ascending: false });
  if (status) query = query.eq("status", status);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,student_no.ilike.%${term}%`);
  const { data, error } = await query;

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Students</p><h1>{data?.length ?? 0} student{data?.length === 1 ? "" : "s"}</h1></div>
        <Link href="/admin/students/new" className="btn btn-orange btn-sm">+ Add student</Link>
      </div>

      <form className="filters" method="get">
        <input name="q" defaultValue={q} placeholder="Search name or ID" aria-label="Search students" />
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
              <tr key={s.id}>
                <td><Link href={`/admin/students/${s.id}`} className="idlink">{s.student_no}</Link></td>
                <td><Link href={`/admin/students/${s.id}`}>{s.full_name}</Link></td>
                <td>{s.session}</td>
                <td><span className={`pill ${pillFor(s.status)}`}>{s.status}</span></td>
                <td className="num" style={{ color: bal > 0 ? "var(--warn)" : "var(--ok)" }}>{bal > 0 ? kwacha(bal) : "Paid"}</td>
                <td>{s.user_id ? "✓" : <span style={{ color: "var(--warn)" }}>None</span>}</td>
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
