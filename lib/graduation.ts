import "server-only";
import { studentFees } from "@/lib/otherFees";

type SB = { from: (t: string) => any; rpc: (f: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Everything a student must settle before graduating. */
export async function clearance(sb: SB, studentId: string) {
  const [{ data: s }, { data: acc }, { data: fee }, other] = await Promise.all([
    sb.from("students").select("full_name,student_no,graduation_paid_on,graduation_amount").eq("id", studentId).maybeSingle(),
    sb.from("student_accounts").select("fees_balance").eq("student_id", studentId).maybeSingle(),
    sb.rpc("graduation_fee"),
    studentFees(sb, studentId),
  ]);
  const gradFee = Number(fee ?? 800);
  const tuition = Math.max(0, Number(acc?.fees_balance ?? 0));
  const checks = [
    { label: "Graduation fee", ok: !!s?.graduation_paid_on, detail: s?.graduation_paid_on ? `Paid K${Number(s.graduation_amount ?? gradFee).toLocaleString()}` : `K${gradFee.toLocaleString()} not yet paid` },
    { label: "Tuition fees", ok: tuition <= 0, detail: tuition > 0 ? `K${tuition.toLocaleString()} balance` : "Cleared" },
    { label: "Other fees", ok: other.balance <= 0, detail: other.balance > 0 ? `K${other.balance.toLocaleString()} balance (${other.fees.filter((f) => f.balance > 0).map((f) => f.name).join(", ")})` : "Cleared" },
    ...(other.items.length ? [{ label: "Registration requirements", ok: other.missing === 0, detail: other.missing ? `Outstanding: ${other.items.filter((i) => !i.provided).map((i) => i.name).join(", ")}` : "All brought" }] : []),
  ];
  return {
    student: s as { full_name: string; student_no: string; graduation_paid_on: string | null; graduation_amount: number | null } | null,
    gradFee,
    checks,
    cleared: checks.every((c) => c.ok),
  };
}
