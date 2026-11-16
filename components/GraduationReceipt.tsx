import PrintButton from "@/components/PrintButton";
import SignatureImg from "@/components/SignatureImg";
import { kwachaInWords } from "@/lib/words";

export const RECEIPT_ISSUER = "Innocent Phiri";

const long = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const k = (n: number) => `K ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Printable graduation receipt, styled after the institute's paper receipt (no receipt number). */
export default function GraduationReceipt({ name, studentNo, paidOn, amount }: { name: string; studentNo: string; paidOn: string; amount: number }) {
  return (
    <div className="greceipt-wrap">
      <div className="noprint" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}><PrintButton label="Print / save as PDF" /></div>
      <article className="greceipt">
        <header className="gr-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Manchilui Training Institute" className="gr-logo" />
          <h1>MANCHILUI TRAINING INSTITUTE</h1>
          <p className="gr-motto">&ldquo;Increasing Value Everyday&rdquo;</p>
          <p className="gr-contact">P.O. Box 510627, Chipata. Cell No. +260 973 742 072</p>
        </header>
        <div className="gr-title"><span>GRADUATION RECEIPT</span></div>
        <dl className="gr-lines">
          <div><dt>Date:</dt><dd>{long(paidOn)}</dd></div>
          <div><dt>Received from:</dt><dd>{name} <small>({studentNo})</small></dd></div>
          <div><dt>The sum of (in words):</dt><dd>{kwachaInWords(amount)}</dd></div>
          <div><dt>In respect of:</dt><dd>Graduation fee</dd></div>
        </dl>
        <div className="gr-foot">
          <div className="gr-issued">
            <div><span className="gr-k">Issued by:</span> <b>{RECEIPT_ISSUER}</b></div>
            <div className="gr-sig"><span className="gr-k">Signature:</span> <SignatureImg /></div>
          </div>
          <div className="gr-amount"><span className="gr-k">Amount</span><b>{k(amount)}</b></div>
        </div>
      </article>
    </div>
  );
}
