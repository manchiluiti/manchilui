import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff, kwacha } from "@/lib/admin";

export const dynamic = "force-dynamic";
const monthName = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lusaka" });

export default async function MyPay() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const me = staff.user.id;
  const [{ data: settings }, { data: slips }] = await Promise.all([
    staff.supabase.from("staff_pay").select("basic_salary,pay_method,pay_to").eq("user_id", me).maybeSingle(),
    // Only paid payslips are visible to staff (enforced in the database).
    staff.supabase.from("payslips").select("id,period,basic,allowances,deductions,net_pay,method,reference,paid_at").eq("staff_id", me).eq("status", "paid").order("period", { ascending: false }),
  ]);
  const year = new Date().getFullYear();
  const thisYear = (slips ?? []).filter((s) => s.period.startsWith(String(year))).reduce((t, s) => t + Number(s.net_pay), 0);
  const latest = slips?.[0];

  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>My pay</p><h1>Salary payments</h1></div></div>

      <div className="tiles">
        <div className="tile"><div className="k">Latest payment</div><div className="v">{latest ? kwacha(latest.net_pay) : "–"}</div><div className="s">{latest ? `${monthName(latest.period)} · paid ${latest.paid_at ? day(latest.paid_at) : ""}` : "No salary paid yet"}</div></div>
        <div className="tile"><div className="k">Paid in {year}</div><div className="v">{kwacha(thisYear)}</div><div className="s">{(slips ?? []).filter((s) => s.period.startsWith(String(year))).length} payment(s)</div></div>
        <div className="tile"><div className="k">Basic salary</div><div className="v">{settings ? kwacha(settings.basic_salary) : "–"}</div><div className="s">{settings ? `${settings.pay_method}${settings.pay_to ? ` · ${settings.pay_to}` : ""}` : "Not set yet. Ask management."}</div></div>
      </div>

      <section className="rec" style={{ marginTop: 24 }}>
        <div className="rec-h"><h2>Payslips</h2></div>
        <div className="rec-b">
          {(slips ?? []).length === 0 && <p className="muted-row">Your payslips appear here once management has paid your salary.</p>}
          {(slips ?? []).map((s) => (
            <Link className="row" href={`/admin/pay/${s.id}`} key={s.id}>
              <div>
                <b>{monthName(s.period)}</b>
                <small>Disbursed {s.paid_at ? day(s.paid_at) : ""} · {s.method}{s.reference ? ` · Ref ${s.reference}` : ""}</small>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="amt">{kwacha(s.net_pay)}</span>
                <small style={{ display: "block" }}>View payslip →</small>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
