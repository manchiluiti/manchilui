import { redirect } from "next/navigation";
import GraduationReceipt from "@/components/GraduationReceipt";
import { requirePortalStudent } from "@/lib/portal";

export const metadata = { title: "Graduation receipt" };

export default async function PortalGraduationReceipt() {
  const { supabase, student } = await requirePortalStudent();
  const [{ data: s }, { data: fee }] = await Promise.all([
    supabase.from("students").select("full_name,student_no,graduation_paid_on,graduation_amount").eq("id", student.id).maybeSingle(),
    supabase.rpc("graduation_fee"),
  ]);
  if (!s?.graduation_paid_on) redirect("/portal/graduation");
  return <GraduationReceipt name={s.full_name} studentNo={s.student_no} paidOn={s.graduation_paid_on} amount={Number(s.graduation_amount ?? fee ?? 800)} />;
}
