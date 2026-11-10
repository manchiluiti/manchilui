import Link from "next/link";
import { requirePortalStudent } from "@/lib/portal";
import { studentFees } from "@/lib/otherFees";

const Back = () => <Link href="/portal/fees" className="backlink">← All fees</Link>;

export const metadata = { title: "Registration requirements" };

export default async function PortalRequirements() {
  const { supabase, student } = await requirePortalStudent();
  const o = await studentFees(supabase, student.id);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Back />
      <div className="rec">
        <div className="rec-h"><h2>Registration requirements</h2><span className={`pill ${o.missing ? "warn" : "ok"}`}>{o.missing ? `${o.missing} outstanding` : "All brought"}</span></div>
        <div className="rec-b">
          {o.items.map((x) => (
            <div className="row" key={x.code}><div><b>{x.name}</b></div><span className={`pill ${x.provided ? "ok" : "warn"}`}>{x.provided ? "✓ Brought" : "Outstanding"}</span></div>
          ))}
          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
}
