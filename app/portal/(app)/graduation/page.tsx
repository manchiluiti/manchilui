import Link from "next/link";
import { clearance } from "@/lib/graduation";
import { requirePortalStudent } from "@/lib/portal";

export const metadata = { title: "Graduation clearance" };

export default async function PortalGraduation() {
  const { supabase, student } = await requirePortalStudent();
  const c = await clearance(supabase, student.id);
  const paid = !!c.student?.graduation_paid_on;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="rec">
        <div className="rec-h">
          <h2>Graduation clearance</h2>
          <span className={`pill ${c.cleared ? "ok" : "warn"}`}>{c.cleared ? "Cleared" : "Not yet cleared"}</span>
        </div>
        <div className="rec-b clear-list">
          {c.checks.map((x) => (
            <div className="row" key={x.label}>
              <div><b>{x.label}</b><small>{x.detail}</small></div>
              <span className={`pill ${x.ok ? "ok" : "warn"}`}>{x.ok ? "✓" : "Outstanding"}</span>
            </div>
          ))}
          <p className="hint" style={{ padding: "10px 0 14px" }}>
            {c.cleared ? "You have met all requirements for graduation." : "Settle everything marked Outstanding at the office to be cleared for graduation."}
          </p>
        </div>
      </div>

      <div className="rec">
        <div className="rec-h"><h2>Graduation fee</h2><span className={`pill ${paid ? "ok" : "warn"}`}>{paid ? "Paid" : `K${c.gradFee.toLocaleString()} due`}</span></div>
        <div className="rec-b" style={{ paddingBlock: 16 }}>
          {paid ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p style={{ margin: 0 }}>Your graduation fee is paid. You can print your receipt.</p>
              <Link className="btn btn-orange btn-sm" href="/portal/graduation/receipt">View &amp; print receipt</Link>
            </div>
          ) : (
            <p style={{ margin: 0 }}>The graduation fee is <b>K{c.gradFee.toLocaleString()}.00</b>. Pay at the office; once it&apos;s recorded you can print your receipt here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
