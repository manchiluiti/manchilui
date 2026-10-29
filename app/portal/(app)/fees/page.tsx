import { feeSummary, kwacha, requirePortalStudent } from "@/lib/portal";

export const metadata = { title: "Fees and payments" };

export default async function PortalFees() {
  const { supabase, student } = await requirePortalStudent();
  const f = await feeSummary(supabase, student.id);
  return (
    <div className="rec">
      <div className="rec-h"><h2>Fees and payments</h2></div>
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
        {f.before > 0 && <div className="row"><div><b>{kwacha(f.before)}</b><small>Paid before the portal started</small></div></div>}
        {f.pays.length === 0 && !f.before && <p className="muted-row">No payments recorded yet.</p>}
        <p className="hint" style={{ padding: "8px 0 12px" }}>Receipts are issued at the office. If a payment is missing, bring your receipt to the office.</p>
      </div>
    </div>
  );
}
