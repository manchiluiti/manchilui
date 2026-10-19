import Link from "next/link";
import { kwacha, requireStaff } from "@/lib/admin";

export default async function Dashboard() {
  const { supabase, name } = await requireStaff();
  const [{ data: students }, { data: enq }, { data: pays }, { count: newEnq }] = await Promise.all([
    supabase.from("students").select("status,fees_balance"),
    supabase.from("enquiries").select("id,full_name,phone,preferred_intake,created_at,handled").order("created_at", { ascending: false }).limit(5),
    supabase.from("payments").select("amount,paid_on,students(full_name,student_no)").order("created_at", { ascending: false }).limit(5),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("handled", false),
  ]);

  const all = students ?? [];
  const active = all.filter((s) => s.status === "Registered").length;
  const owed = all.reduce((t, s) => t + Math.max(0, Number(s.fees_balance)), 0);
  const owing = all.filter((s) => Number(s.fees_balance) > 0).length;
  const first = name.split(" ")[0];

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Dashboard</p><h1>Hello, {first}</h1></div>
        <Link href="/admin/students/new" className="btn btn-orange btn-sm">+ Add student</Link>
      </div>

      <div className="tiles">
        <div className="tile"><div className="k">Students</div><div className="v">{all.length}</div><div className="s">{active} registered</div></div>
        <div className="tile"><div className="k">Fees outstanding</div><div className="v">{kwacha(owed)}</div><div className="s">{owing} student{owing === 1 ? "" : "s"} owing</div></div>
        <div className="tile"><div className="k">New enquiries</div><div className="v">{newEnq ?? 0}</div><div className="s">waiting for a call back</div></div>
      </div>

      <div className="grid2" style={{ gap: 24, marginTop: 24 }}>
        <section className="rec">
          <div className="rec-h"><h2>Latest enquiries</h2><Link className="copy" href="/admin/enquiries">See all</Link></div>
          <div className="rec-b">
            {(enq ?? []).length === 0 && <p className="muted-row">No enquiries yet. They appear here when someone uses the Admissions form.</p>}
            {(enq ?? []).map((e) => (
              <div className="row" key={e.id}>
                <div><b>{e.full_name}</b><small>{e.phone} · {e.preferred_intake}</small></div>
                <span className={`pill ${e.handled ? "wait" : "warn"}`}>{e.handled ? "Handled" : "New"}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rec">
          <div className="rec-h"><h2>Latest payments</h2></div>
          <div className="rec-b">
            {(pays ?? []).length === 0 && <p className="muted-row">No payments recorded yet. Record one from a student&apos;s page.</p>}
            {(pays ?? []).map((p, i) => {
              const s = p.students as unknown as { full_name: string; student_no: string } | null;
              return (
                <div className="row" key={i}>
                  <div><b>{s?.full_name ?? "Student"}</b><small>{s?.student_no} · {p.paid_on}</small></div>
                  <span className="amt">{kwacha(p.amount)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
