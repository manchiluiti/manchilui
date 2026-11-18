import Link from "next/link";
import { kwacha, managementPage } from "@/lib/admin";

type Row = { id: string; student_no: string; full_name: string; status: string; fees: number; other: number; bal: number };
type Group = { session: string; archived: boolean; started: string; students: number; owing: Row[]; owed: number };

export default async function Outstanding() {
  const { supabase } = await managementPage();
  const { data, error } = await supabase
    .from("students")
    .select("id,student_no,full_name,session,status,archived_at,created_at,student_accounts(fees_balance,other_balance)")
    .order("created_at");

  const map = new Map<string, Group>();
  (data ?? []).forEach((s) => {
    const a = s.student_accounts as unknown as { fees_balance: number; other_balance?: number } | null;
    const fees = Number(a?.fees_balance ?? 0);
    const other = Number(a?.other_balance ?? 0);
    const bal = fees + other;
    const key = `${s.archived_at ? "a" : "c"}|${s.session}`;
    const g = map.get(key) ?? { session: s.session, archived: !!s.archived_at, started: s.created_at, students: 0, owing: [] as Row[], owed: 0 };
    g.students++;
    if (bal > 0) {
      g.owing.push({ id: s.id, student_no: s.student_no, full_name: s.full_name, status: s.status, fees, other, bal });
      g.owed += bal;
    }
    map.set(key, g);
  });
  const groups = [...map.values()];
  groups.forEach((g) => g.owing.sort((x, y) => y.bal - x.bal));
  const current = groups.filter((g) => !g.archived);
  const archived = groups.filter((g) => g.archived && g.owing.length > 0);
  const total = current.reduce((t, g) => t + g.owed, 0);
  const owingCount = current.reduce((t, g) => t + g.owing.length, 0);

  const section = (g: Group) => (
    <section className="rec" key={`${g.archived}-${g.session}`} id={encodeURIComponent(g.session)} style={{ marginBottom: 24 }}>
      <div className="rec-h">
        <div>
          <h2>{g.session}{g.archived ? " (archived)" : ""}</h2>
          <small className="sub">{g.owing.length} of {g.students} student{g.students === 1 ? "" : "s"} owing</small>
        </div>
        <b style={{ fontSize: "1.3rem", color: g.owed > 0 ? "var(--warn)" : "var(--ok)", fontVariantNumeric: "tabular-nums" }}>{g.owed > 0 ? kwacha(g.owed) : "All paid"}</b>
      </div>
      {g.owing.length > 0 && (
        <div className="tablewrap flat">
          <table className="table">
            <thead><tr><th>Student ID</th><th>Name</th><th>Status</th><th className="num">Tuition</th><th className="num">Other fees</th><th className="num">Total owing</th></tr></thead>
            <tbody>
              {g.owing.map((s) => (
                <tr key={s.id} className="rowlink">
                  {[
                    <span key="id" className="idlink">{s.student_no}</span>,
                    <span key="n">{s.full_name}</span>,
                    <span key="st">{s.status}</span>,
                    <span key="f">{s.fees > 0 ? kwacha(s.fees) : "–"}</span>,
                    <span key="o">{s.other > 0 ? kwacha(s.other) : "–"}</span>,
                    <span key="b" style={{ color: "var(--warn)" }}>{kwacha(s.bal)}</span>,
                  ].map((content, i) => (
                    <td key={i} className={i >= 3 ? "num" : undefined}>
                      <Link href={`/admin/students/${s.id}`} className="cell-link" tabIndex={i === 0 ? 0 : -1} aria-label={i === 0 ? `Open ${s.full_name}` : undefined}>{content}</Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin">Dashboard</Link> / Fees outstanding</p><h1>{kwacha(total)} outstanding</h1></div>
        <Link href="/admin/students/fees" className="btn btn-navy btn-sm">Edit fees</Link>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error.message}</div>}

      <div className="tiles" style={{ marginBottom: 24 }}>
        {current.map((g) => (
          <a key={g.session} href={`#${encodeURIComponent(g.session)}`} className="tile" style={{ color: "inherit" }}>
            <div className="k">{g.session}</div>
            <div className="v">{kwacha(g.owed)}</div>
            <div className="s">{g.owing.length} student{g.owing.length === 1 ? "" : "s"} owing</div>
          </a>
        ))}
      </div>
      {current.length > 1 && <p className="hint" style={{ marginBottom: 24 }}>{owingCount} students owing across {current.length} current intakes.</p>}

      {current.map(section)}

      {archived.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "32px 0 16px" }}>Archived intakes still owing</h2>
          {archived.map(section)}
        </>
      )}
    </>
  );
}
