import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import PrintButton from "@/components/PrintButton";
import { kwacha, managementPage } from "@/lib/admin";
import { SITE } from "@/lib/site";

const long = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const { data: p } = await supabase.from("payments").select("id,receipt_no,amount,method,reference,paid_on,recorded_by,student_id").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: s }, { data: acc }, { data: by }] = await Promise.all([
    supabase.from("students").select("full_name,student_no,programme,session").eq("id", p.student_id).maybeSingle(),
    supabase.from("student_accounts").select("fees_balance").eq("student_id", p.student_id).maybeSingle(),
    supabase.from("staff").select("full_name").eq("user_id", p.recorded_by ?? "").maybeSingle(),
  ]);
  const no = `MTI-R${String(p.receipt_no).padStart(5, "0")}`;

  return (
    <div className="payslip-wrap">
      <div className="noprint" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><PrintButton label="Print receipt" /></div>
      <article className="payslip">
        <header>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Logo size={56} />
            <div><b className="ps-name">{SITE.name}</b><small>{SITE.address} · {SITE.phone}</small></div>
          </div>
          <div className="ps-title"><span>Official receipt</span><b>{no}</b></div>
        </header>
        <div className="ps-grid">
          <div><span>Received from</span><b>{s?.full_name}</b></div>
          <div><span>Student ID</span><b>{s?.student_no}</b></div>
          <div><span>Programme</span><b>{s?.programme}</b></div>
          <div><span>Session</span><b>{s?.session}</b></div>
          <div><span>Date</span><b>{long(p.paid_on)}</b></div>
          <div><span>Paid by</span><b>{p.method}{p.reference ? ` · Ref ${p.reference}` : ""}</b></div>
        </div>
        <table className="ps-table">
          <tbody>
            <tr><td>Tuition fees payment</td><td className="num">{kwacha(p.amount)}</td></tr>
            <tr className="net"><td>Amount received</td><td className="num">{kwacha(p.amount)}</td></tr>
            <tr><td>Balance remaining (as at printing)</td><td className="num">{kwacha(acc?.fees_balance ?? 0)}</td></tr>
          </tbody>
        </table>
        <div className="sigs">
          <div><span /><small>Received by{by?.full_name ? `: ${by.full_name}` : ""}</small></div>
          <div><span /><small>Stamp</small></div>
        </div>
        <footer>Thank you. Keep this receipt as proof of payment.</footer>
      </article>
    </div>
  );
}
