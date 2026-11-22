import PrintButton from "@/components/PrintButton";
import { ACCEPTANCE_FEES, ACCEPTANCE_ITEMS, DIRECTOR, POSTAL } from "@/lib/acceptance";
import { SITE } from "@/lib/site";

const k = (n: number) => `K ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const long = (s: string | null) => (s ? new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lusaka" }) : "");

type Props = { name: string; town?: string | null; phone?: string | null; letterDate: string; startDate: string | null; tuition: number; graduationFee: number; note?: string | null };

/** The acceptance letter every applicant accepted through the system receives (2 pages: letter + school rules). */
export default function AcceptanceLetter({ name, town, phone, letterDate, startDate, tuition, graduationFee, note }: Props) {
  const total = tuition + ACCEPTANCE_FEES.reduce((t, f) => t + f.amount, 0);
  return (
    <div className="acc-wrap">
      <div className="noprint" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><PrintButton label="Print / save as PDF" /></div>

      <article className="acc-page">
        <header className="acc-head">
          <div className="acc-head-l"><b>All correspondence should be addressed to:</b><br />The Principal<br />Phone: {SITE.phone}<br />Email: {SITE.email}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="acc-logo" />
          <div className="acc-head-r"><b>{SITE.name}</b><br />{POSTAL.split(", ")[0]}<br />{POSTAL.split(", ")[1]}<br />Zambia</div>
        </header>

        <p className="acc-date">{long(letterDate)}</p>
        <p className="acc-to"><b>{name}</b>{town ? <><br />{town}</> : null}{phone ? <><br />{phone}</> : null}</p>

        <h1 className="acc-title">ACCEPTANCE LETTER</h1>
        <p>Dear {name},</p>
        <p>
          {SITE.name} is pleased to inform you that you have been accepted as a student on the <b>{SITE.programme}</b> programme.
          {startDate ? <> The school opens on <b>{long(startDate)}</b>. Please report on that day with the following requirements.</> : <> Please report on the opening day with the following requirements.</>}
        </p>

        <h2 className="acc-h2">REQUIREMENTS</h2>
        <table className="acc-table">
          <tbody>
            <tr><td>1.</td><td>School fees (payable in instalments)</td><td className="num">{k(tuition)}</td></tr>
            {ACCEPTANCE_FEES.map((f, i) => <tr key={f.name}><td>{i + 2}.</td><td>{f.name}</td><td className="num">{k(f.amount)}</td></tr>)}
            <tr className="acc-total"><td /><td>Total fees</td><td className="num">{k(total)}</td></tr>
            {ACCEPTANCE_ITEMS.map((it, i) => <tr key={it}><td>{ACCEPTANCE_FEES.length + i + 2}.</td><td colSpan={2}>{it}</td></tr>)}
          </tbody>
        </table>

        <p>Please bring this letter, your NRC and your original Grade 12 results when reporting. After registration you will receive your student ID and login for the Student Portal at manchilui.com/portal.</p>
        {note && <p>{note}</p>}
        <p>We wish you a happy and successful stay with us.</p>
        <p>Yours faithfully,</p>
        <div className="acc-sign"><span /><b>{DIRECTOR.name.toUpperCase()}</b><br />{DIRECTOR.title.toUpperCase()}</div>
      </article>

      <article className="acc-page acc-break">
        <h1 className="acc-title">SCHOOL RULES</h1>
        <ol className="acc-rules">
          <li>Attendance is compulsory and must not fall below 75%. Students must attend classes regularly and on time.</li>
          <li>Malpractice in examinations leads to severe punishment, including expulsion.</li>
          <li>Ragging and bullying are strictly banned and carry legal consequences.</li>
          <li>Removing, damaging or defacing college property is prohibited, and the student will be charged for it.</li>
          <li>Drinking or possessing alcohol, drugs or tobacco on campus is strictly forbidden.</li>
          <li>Students must wear the prescribed uniform or formal attire and carry their identity card at all times.</li>
          <li>Phones must not be used, and chatting is not allowed, during lectures.</li>
          <li>Follow the 24-hour rule in stressful situations: wait a day before reacting to a problem.</li>
          <li>Students must obey the instructions of staff at all times while staff carry out their duties.</li>
          <li>Students must behave well on their way to and from the college. Any behaviour, even outside school hours, that brings the college into disrepute will be treated very seriously.</li>
          <li>Students must arrive at the college by 08:00 hours for registration.</li>
          <li>Students who are sick must report to the school authorities immediately. In an emergency at the college, the institute will provide transport to hospital and contact the parents.</li>
          <li>Students who need to visit their parents because of circumstances beyond their control must get permission from the Administration before travelling.</li>
          <li>The institute holds a graduation ceremony at the end of the course. Each student pays a graduation fee of <b>{k(graduationFee)}</b> and may bring two visitors. Attendance at the ceremony is compulsory.</li>
          <li>
            <b>Payment</b>
            <ol type="a">
              <li>On arrival, students must make a first payment towards school fees and bring the other requirements listed in the acceptance letter.</li>
              <li>The remaining balance is paid in instalments, as communicated by the college accounts office.</li>
              <li>No student will be allowed to report without making a payment.</li>
              <li>Students with outstanding balances will be sent home to collect the money before being allowed back into class.</li>
            </ol>
          </li>
        </ol>

        <h2 className="acc-h2">DECLARATION</h2>
        <p>I, <b>{name}</b>, declare that I will comply with each and every rule laid down by the institute.</p>
        <div className="acc-decl">
          <div><span />Date</div>
          <div><span />Signature</div>
        </div>
      </article>
    </div>
  );
}
