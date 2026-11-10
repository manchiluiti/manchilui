import { feeSummary, kwacha, requirePortalStudent } from "@/lib/portal";
import { studentFees } from "@/lib/otherFees";

export const metadata = { title: "Fees and payments" };

export default async function PortalFees() {
  const { supabase, student } = await requirePortalStudent();
  const [f, o] = await Promise.all([feeSummary(supabase, student.id), studentFees(supabase, student.id)]);
  const computer = o.fees.find((x) => x.code === "computer");
  const rest = o.fees.filter((x) => x.code !== "computer");
  const restBal = rest.reduce((t, x) => t + x.balance, 0);
  const tuitionTotal = f.paid + Math.max(0, f.bal);
  const top = [
    { name: "Tuition fee", total: tuitionTotal, paid: f.paid, bal: Math.max(0, f.bal) },
    ...(computer ? [{ name: "Computer fee", total: Number(computer.amount ?? 0), paid: computer.paid, bal: computer.balance }] : []),
  ];
  const owedTop = top.reduce((t, x) => t + x.bal, 0);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="rec">
        <div className="rec-h"><h2>Fees</h2><span className={`pill ${owedTop > 0 ? "warn" : "ok"}`}>{owedTop > 0 ? `${kwacha(owedTop)} owing` : "All paid"}</span></div>
        <div className="feegrid">
          {top.map((x) => (
            <div className="feeline" key={x.name}>
              <div className="feeline-h"><b>{x.name}</b><span className={`pill ${x.bal > 0 ? "warn" : "ok"}`}>{x.bal > 0 ? "Balance due" : "Paid"}</span></div>
              <div className="feeline-nums">
                <div><span className="k">Total</span><span className="v">{kwacha(x.total)}</span></div>
                <div><span className="k">Paid</span><span className="v" style={{ color: "var(--ok)" }}>{kwacha(x.paid)}</span></div>
                <div><span className="k">Balance</span><span className="v" style={{ color: x.bal > 0 ? "var(--warn)" : "var(--ok)" }}>{kwacha(x.bal)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rec">
        <div className="rec-h"><h2>Tuition payment history</h2></div>
        <div className="rec-b">
          {f.pays.map((p) => (
            <div className="row" key={p.id}>
              <div><b>{kwacha(p.amount)}</b><small>{p.paid_on} · {p.method}{p.reference ? ` · Ref ${p.reference}` : ""}</small></div>
            </div>
          ))}
          {f.before > 0 && <div className="row"><div><b>{kwacha(f.before)}</b></div></div>}
          {f.pays.length === 0 && !f.before && <p className="muted-row">No payments recorded yet.</p>}
          <p className="hint" style={{ padding: "8px 0 12px" }}>Receipts are issued at the office. If a payment is missing, bring your receipt to the office.</p>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="rec">
          <div className="rec-h"><h2>Other fees</h2><span className={`pill ${restBal > 0 ? "warn" : "ok"}`}>{restBal > 0 ? `${kwacha(restBal)} owing` : "All paid"}</span></div>
          <div className="rec-b" style={{ overflowX: "auto" }}>
            <table className="results">
              <thead><tr><th>Fee</th><th className="num">Amount</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {rest.map((x) => (
                  <tr key={x.code}>
                    <td>{x.name}</td>
                    <td className="num">{kwacha(x.amount ?? 0)}</td>
                    <td className="num" style={{ color: "var(--ok)" }}>{kwacha(x.paid)}</td>
                    <td className="num" style={{ color: x.balance > 0 ? "var(--warn)" : undefined, fontWeight: x.balance > 0 ? 700 : undefined }}>{x.balance > 0 ? kwacha(x.balance) : "Paid"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {o.items.length > 0 && (
        <div className="rec">
          <div className="rec-h"><h2>Registration requirements</h2><span className={`pill ${o.missing ? "warn" : "ok"}`}>{o.missing ? `${o.missing} outstanding` : "All brought"}</span></div>
          <div className="rec-b">
            {o.items.map((x) => (
              <div className="row" key={x.code}><div><b>{x.name}</b></div><span className={`pill ${x.provided ? "ok" : "warn"}`}>{x.provided ? "✓ Brought" : "Outstanding"}</span></div>
            ))}
            <div style={{ height: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}
