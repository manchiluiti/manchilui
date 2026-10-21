import Link from "next/link";
import { managementPage } from "@/lib/admin";

const STAGES = ["Applied", "Accepted", "Registered", "Rejected"] as const;
const pill = (s: string) => (s === "Registered" ? "ok" : s === "Accepted" ? "ok" : s === "Rejected" ? "wait" : "warn");
const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lusaka" });

export default async function Applications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "Applied" } = await searchParams;
  const { supabase } = await managementPage();
  const [{ data: all }, { data: rows }] = await Promise.all([
    supabase.from("applications").select("status"),
    supabase.from("applications").select("id,full_name,phone,town,preferred_intake,status,created_at").eq("status", status).order("created_at", { ascending: false }),
  ]);
  const count = (s: string) => (all ?? []).filter((a) => a.status === s).length;

  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Admissions</p><h1>Applications</h1></div></div>
      <div className="stages">
        {STAGES.map((s) => (
          <Link key={s} href={`/admin/applications?status=${s}`} className={s === status ? "on" : ""}>
            {s === "Applied" ? "New" : s} <span>{count(s)}</span>
          </Link>
        ))}
      </div>
      <div className="tablewrap">
        <table className="table">
          <thead><tr><th>Applicant</th><th>Phone</th><th>Town</th><th>Intake</th><th>Received</th><th>Status</th></tr></thead>
          <tbody>
            {(rows ?? []).map((a) => (
              <tr key={a.id}>
                <td><Link className="idlink" href={`/admin/applications/${a.id}`}>{a.full_name}</Link></td>
                <td>{a.phone}</td>
                <td>{a.town ?? "–"}</td>
                <td>{a.preferred_intake ?? "–"}</td>
                <td>{when(a.created_at)}</td>
                <td><span className={`pill ${pill(a.status)}`}>{a.status === "Applied" ? "New" : a.status}</span></td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && <tr><td colSpan={6} className="muted-row">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
