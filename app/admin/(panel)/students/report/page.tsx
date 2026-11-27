import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { currentIntakes, managementPage } from "@/lib/admin";

type Row = {
  id: string; student_no: string; full_name: string; session: string;
  student_accounts: { fees_balance: number; paid_before: number } | null;
  payments: { amount: number }[];
  student_fee_items: { item_code: string; balance: number }[];
};

const k = (n: number) => n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Printable fees report for one intake: tuition paid/balance and computer fee paid/balance per student. */
export default async function FeesReport({ searchParams }: { searchParams: Promise<{ intake?: string }> }) {
  const { intake: wanted } = await searchParams;
  const { supabase } = await managementPage();
  const intakes = await currentIntakes(supabase);
  const intake = wanted && intakes.includes(wanted) ? wanted : wanted || intakes[0] || "";
  const [{ data }, { data: comp }] = await Promise.all([
    supabase.from("students")
      .select("id,student_no,full_name,session,student_accounts(fees_balance,paid_before),payments(amount),student_fee_items(item_code,balance)")
      .eq("session", intake).neq("status", "Withdrawn").order("full_name"),
    supabase.from("fee_items").select("amount").eq("code", "computer").maybeSingle(),
  ]);
  const compFee = Number(comp?.amount ?? 700);
  const rows = ((data ?? []) as unknown as Row[]).map((s) => {
    const tPaid = Number(s.student_accounts?.paid_before ?? 0) + (s.payments ?? []).reduce((t, p) => t + Number(p.amount), 0);
    const tBal = Math.max(0, Number(s.student_accounts?.fees_balance ?? 0));
    const cBal = Number((s.student_fee_items ?? []).find((f) => f.item_code === "computer")?.balance ?? 0);
    return { ...s, tPaid, tBal, cPaid: Math.max(0, compFee - cBal), cBal, owed: tBal + cBal };
  });
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((t, r) => t + f(r), 0);
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lusaka" });

  return (
    <div className="rep-wrap">
      <div className="noprint" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <nav className="seg" aria-label="Intake" style={{ margin: 0 }}>
          {intakes.map((i) => <Link key={i} href={`/admin/students/report?intake=${encodeURIComponent(i)}`} className={i === intake ? "on" : ""}>{i}</Link>)}
        </nav>
        <PrintButton label="Print / save as PDF" />
      </div>

      <article className="rep">
        <header className="rep-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          <div>
            <h1>MANCHILUI TRAINING INSTITUTE</h1>
            <p>Fees report · <b>{intake}</b> · as at {today}</p>
          </div>
        </header>

        <table className="rep-table">
          <thead>
            <tr><th rowSpan={2}>#</th><th rowSpan={2}>Student</th><th rowSpan={2}>ID</th><th colSpan={2} className="grp">Tuition fees</th><th colSpan={2} className="grp">Computer fee (K{compFee})</th><th rowSpan={2} className="num">Total owing</th></tr>
            <tr><th className="num">Paid</th><th className="num">Balance</th><th className="num">Paid</th><th className="num">Balance</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={r.owed > 0 ? "owe" : ""}>
                <td>{i + 1}</td><td>{r.full_name}</td><td>{r.student_no}</td>
                <td className="num">{k(r.tPaid)}</td><td className="num bal">{r.tBal ? k(r.tBal) : "–"}</td>
                <td className="num">{k(r.cPaid)}</td><td className="num bal">{r.cBal ? k(r.cBal) : "–"}</td>
                <td className="num bal"><b>{r.owed ? k(r.owed) : "Cleared"}</b></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}>Totals ({rows.length} students)</td><td className="num">{k(sum((r) => r.tPaid))}</td><td className="num">{k(sum((r) => r.tBal))}</td><td className="num">{k(sum((r) => r.cPaid))}</td><td className="num">{k(sum((r) => r.cBal))}</td><td className="num">{k(sum((r) => r.owed))}</td></tr>
          </tfoot>
        </table>
        <p className="rep-note">{rows.filter((r) => r.owed > 0).length} of {rows.length} students still owe. Amounts in Kwacha. Withdrawn students are excluded.</p>
      </article>
    </div>
  );
}
