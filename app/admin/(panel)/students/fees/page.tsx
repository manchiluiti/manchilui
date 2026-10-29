import Link from "next/link";
import FeesTable, { type FeeStudent } from "@/components/FeesTable";
import { managementPage, tuitionFee } from "@/lib/admin";

export const maxDuration = 60;

export default async function FeesPage() {
  const { supabase } = await managementPage();
  const [{ data: students }, { data: pays }] = await Promise.all([
    supabase.from("students").select("id,student_no,full_name,session,status,student_accounts(fees_balance,paid_before)").neq("status", "Withdrawn").is("archived_at", null).order("student_no"),
    supabase.from("payments").select("student_id,amount"),
  ]);
  const fee = await tuitionFee(supabase);
  const recorded = new Map<string, number>();
  (pays ?? []).forEach((p) => recorded.set(p.student_id, (recorded.get(p.student_id) ?? 0) + Number(p.amount)));
  const rows: FeeStudent[] = (students ?? []).map((s) => {
    const a = s.student_accounts as unknown as { fees_balance: number; paid_before: number } | null;
    return {
      id: s.id, student_no: s.student_no, full_name: s.full_name, session: s.session,
      paid: Number(a?.paid_before ?? 0) + (recorded.get(s.id) ?? 0),
      balance: Number(a?.fees_balance ?? 0),
    };
  });

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/students">Students</Link> / Fees</p><h1>Fees for all students</h1></div>
      </div>
      <p className="hint" style={{ marginBottom: 16, maxWidth: 760 }}>
        Type each student&apos;s amount paid so far and balance, then save. Rows you change turn orange. For new money received from now on, use Record a payment on the student&apos;s page so they get a receipt.
      </p>
      <FeesTable students={rows} fee={fee} />
    </>
  );
}
