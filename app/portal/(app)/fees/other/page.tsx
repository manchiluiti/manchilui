import Link from "next/link";
import { kwacha, requirePortalStudent } from "@/lib/portal";
import { studentFees } from "@/lib/otherFees";

const Back = () => <Link href="/portal/fees" className="backlink">← All fees</Link>;

export const metadata = { title: "Other fees" };

export default async function PortalOtherFees() {
  const { supabase, student } = await requirePortalStudent();
  const o = await studentFees(supabase, student.id);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Back />
    <div className="rec">
      <div className="rec-h"><h2>Other fees</h2><span className={`pill ${o.balance > 0 ? "warn" : "ok"}`}>{o.balance > 0 ? `${kwacha(o.balance)} owing` : "All paid"}</span></div>
      <div className="rec-b" style={{ overflowX: "auto" }}>
        <table className="results">
          <thead><tr><th>Fee</th><th className="num">Amount</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
          <tbody>
            {o.fees.map((x) => (
              <tr key={x.code}>
                <td>{x.name}</td>
                <td className="num">{kwacha(x.amount ?? 0)}</td>
                <td className="num" style={{ color: "var(--ok)" }}>{kwacha(x.paid)}</td>
                <td className="num" style={{ color: x.balance > 0 ? "var(--warn)" : undefined, fontWeight: x.balance > 0 ? 700 : undefined }}>{x.balance > 0 ? kwacha(x.balance) : "Paid"}</td>
              </tr>
            ))}
            <tr><td><b>Total</b></td><td className="num"><b>{kwacha(o.total)}</b></td><td className="num"><b>{kwacha(o.paid)}</b></td><td className="num"><b>{kwacha(o.balance)}</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
