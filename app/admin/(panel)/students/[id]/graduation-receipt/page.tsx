import { notFound } from "next/navigation";
import GraduationReceipt from "@/components/GraduationReceipt";
import { managementPage } from "@/lib/admin";

export default async function AdminGraduationReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const { data: s } = await supabase.from("students").select("full_name,student_no,graduation_paid_on,graduation_amount").eq("id", id).maybeSingle();
  if (!s?.graduation_paid_on) notFound();
  return <GraduationReceipt name={s.full_name} studentNo={s.student_no} paidOn={s.graduation_paid_on} amount={Number(s.graduation_amount ?? 800)} />;
}
