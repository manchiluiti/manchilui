import { feeSummary, kwacha, requirePortalStudent } from "@/lib/portal";
import { studentFees } from "@/lib/otherFees";

export const metadata = { title: "Fees and payments" };

export default async function PortalFees() {
  const { supabase, student } = await requirePortalStudent();
  const [f, o] = await Promise.all([feeSummary(supabase, student.id), studentFees(supabase, student.id)]);
  return (
    <div style={{ display: "grid", gap: 24 }}>
    <div className="rec">
      <div className="rec-h"><h2>Tuition fees</h2></div>
      <div className="feesum">
        <div><div className="k">Total fees</div><div className="v">{kwacha(f.paid + f.bal)}</div></div>
        <div><div className="k">Paid</div><div className="v" style={{ color: "var(--ok)" }}>{kwacha(f.paid)}</div></div>
        <div><div className="k">Balance</div><div className="v" style={{ color: f.owing ? "var(--warn)" : "var(--ok)" }}>{f.owing ? kwacha(f.bal) : "K 0.00"}</div></div>
      </div>
      <div className="rec-b">
        <h3 className="subhead">Payment history</h3>
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