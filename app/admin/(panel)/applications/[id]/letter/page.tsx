import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import PrintButton from "@/components/PrintButton";
import { kwacha, managementPage } from "@/lib/admin";
import { SITE } from "@/lib/site";

const long = (s: string | null) => (s ? new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lusaka" }) : "");

export default async function Letter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const { data: a } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  if (!a || !(a.status === "Accepted" || a.status === "Registered")) notFound();

  return (
    <div className="payslip-wrap">
      <div className="noprint" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><PrintButton label="Print letter" /></div>
      <article className="payslip letter">
        <header>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Logo size={64} />
            <div><b className="ps-name">{SITE.name}</b><small>{SITE.address}<br />{SITE.directorPhone} · {SITE.email}</small></div>
          </div>
        </header>
        <p>{long(a.reviewed_at ?? new Date().toISOString())}</p>
        <p><b>{a.full_name}</b>{a.town ? <><br />{a.town}</> : null}<br />{a.phone}</p>
        <h2 className="letter-title">Offer of Admission: {SITE.programme}</h2>
        <p>Dear {a.full_name.split(" ")[0]},</p>
        <p>We are pleased to inform you that your application to {SITE.name} has been successful. You are offered a place on the six-month {SITE.programme} programme.</p>
        <table className="ps-table">
          <tbody>
            <tr><td>Programme</td><td className="num">{SITE.programme}</td></tr>
            <tr><td>Duration</td><td className="num">6 months, full time</td></tr>
            <tr><td>Start date</td><td className="num">{long(a.start_date)}</td></tr>
            <tr className="net"><td>Total fees</td><td className="num">{kwacha(a.fees_offered ?? 0)}</td></tr>
          </tbody>
        </table>
        <p>To complete your registration, please report to the institute in Eastrise, Chipata, with your original Grade 12 results, your NRC, two passport-size photos and your first fee payment. You will then receive your student ID and Student Portal login.</p>
        {a.decision_note && <p>{a.decision_note}</p>}
        <p>Congratulations, and welcome to Manchilui.</p>
        <div className="sigs" style={{ gridTemplateColumns: "1fr" , maxWidth: 280 }}>
          <div><span /><small>The Director<br />{SITE.name}</small></div>
        </div>
      </article>
    </div>
  );
}
