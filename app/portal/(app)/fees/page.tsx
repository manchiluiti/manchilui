import Link from "next/link";
import { feeSummary, kwacha, requirePortalStudent } from "@/lib/portal";
import { studentFees } from "@/lib/otherFees";

export const metadata = { title: "Fees and payments" };

export default async function PortalFees() {
  const { supabase, student } = await requirePortalStudent();
  const [f, o] = await Promise.all([feeSummary(supabase, student.id), studentFees(supabase, student.id)]);
  const owed = Math.max(0, f.bal) + o.balance;
  const owingOther = o.fees.filter((x) => x.balance > 0);
  const missing = o.items.filter((x) => !x.provided);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="rec">
        <div className="rec-h"><h2>Fees and payments</h2><span className={`pill ${owed > 0 ? "warn" : "ok"}`}>{owed > 0 ? "Balance due" : "All paid"}</span></div>
        <div className="feetotal">
          <div className="k">Total balance owed</div>
          <div className="v" style={{ color: owed > 0 ? "var(--warn)" : "var(--ok)" }}>{owed > 0 ? kwacha(owed) : "K 0.00"}</div>
          <small>Tuition plus other fees. Tap a section for details.</small>
        </div>
      </div>

      <Link href="/portal/fees/tuition" className="feecard">
        <div className="feecard-h"><b>Tuition fees</b><span className="arrow">→</span></div>
        <div className="feecard-row"><span>Paid {kwacha(f.paid)} of {kwacha(f.paid + Math.max(0, f.bal))}</span></div>
        <div className="feecard-bal" style={{ color: f.owing ? "var(--warn)" : "var(--ok)" }}>{f.owing ? `${kwacha(f.bal)} balance` : "Fully paid"}</div>
      </Link>

      <Link href="/portal/fees/other" className="feecard">
        <div className="feecard-h"><b>Other fees</b><span className="arrow">→</span></div>
        <div className="feecard-row"><span>{o.fees.map((x) => x.name).join(", ")}</span></div>
        <div className="feecard-bal" style={{ color: o.balance > 0 ? "var(--warn)" : "var(--ok)" }}>
          {o.balance > 0 ? `${kwacha(o.balance)} balance · ${owingOther.map((x) => x.name).join(", ")}` : "All paid"}
        </div>
      </Link>

      {o.items.length > 0 && (
        <Link href="/portal/fees/requirements" className="feecard">
          <div className="feecard-h"><b>Registration requirements</b><span className="arrow">→</span></div>
          <div className="feecard-row"><span>{o.items.map((x) => x.name).join(", ")}</span></div>
          <div className="feecard-bal" style={{ color: missing.length ? "var(--warn)" : "var(--ok)" }}>
            {missing.length ? `Outstanding: ${missing.map((x) => x.name).join(", ")}` : "All brought"}
          </div>
        </Link>
      )}

      <p className="hint" style={{ textAlign: "center" }}>Receipts are issued at the office.</p>
    </div>
  );
}
