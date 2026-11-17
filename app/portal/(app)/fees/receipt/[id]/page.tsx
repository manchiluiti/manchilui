import { notFound } from "next/navigation";
import SchoolReceipt from "@/components/SchoolReceipt";
import { requirePortalStudent } from "@/lib/portal";

export const metadata = { title: "Tuition receipt" };


/** A student's own tuition receipt: one recorded payment, or "earlier" for amounts paid before payments were recorded individually. */
export default async function PortalTuitionReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, student } = await requirePortalStudent();

  if (id === "earlier") {
    const [{ data: acc }, { data: s }] = await Promise.all([
      supabase.from("student_accounts").select("paid_before").eq("student_id", student.id).maybeSingle(),
      supabase.from("students").select("created_at").eq("id", student.id).maybeSingle(),
    ]);
    const amount = Number(acc?.paid_before ?? 0);
    if (amount <= 0) notFound();
    return <SchoolReceipt title="GENERAL RECEIPT" date={s?.created_at ?? new Date().toISOString()} name={student.full_name} studentNo={student.student_no} amount={amount} respectOf="Tuition fees" note="payments to this date" />;
  }

  // Row level security only returns the student's own payments.
  const { data: p } = await supabase.from("payments").select("receipt_no,amount,method,reference,paid_on,student_id").eq("id", id).maybeSingle();
  if (!p || p.student_id !== student.id) notFound();
  return (
    <SchoolReceipt
      title="GENERAL RECEIPT"
      number={p.receipt_no ? String(p.receipt_no).padStart(4, "0") : undefined}
      date={p.paid_on}
      name={student.full_name}
      studentNo={student.student_no}
      amount={Number(p.amount)}
      respectOf="Tuition fees"
      note={`${p.method}${p.reference ? `, ref ${p.reference}` : ""}`}
    />
  );
}
