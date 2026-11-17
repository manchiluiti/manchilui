import { notFound } from "next/navigation";
import SchoolReceipt from "@/components/SchoolReceipt";
import { managementPage } from "@/lib/admin";

/** Office copy of a tuition receipt: same design students print from the portal. */
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const { data: p } = await supabase.from("payments").select("amount,paid_on,student_id").eq("id", id).maybeSingle();
  if (!p) notFound();
  const { data: s } = await supabase.from("students").select("full_name,student_no").eq("id", p.student_id).maybeSingle();
  return (
    <SchoolReceipt
      title="GENERAL RECEIPT"
      date={p.paid_on}
      name={s?.full_name ?? ""}
      studentNo={s?.student_no ?? ""}
      amount={Number(p.amount)}
      respectOf="Tuition"
    />
  );
}
