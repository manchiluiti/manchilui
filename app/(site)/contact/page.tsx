import CopyButton from "@/components/CopyButton";
import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/site";

export const metadata = { title: "Contact" };

export default function Contact() {
  return (
    <>
      <PageHeader crumb="Contact" title="Contact" sub="Call, message or visit us in Eastrise." />
      <section className="sec">
        <div className="wrap grid2">
          <div className="ccard">
            <div className="k">Director · Call / WhatsApp</div>
            <a className="v" href={`tel:${SITE.directorPhone.replace(/\s/g, "")}`}>{SITE.directorPhone}</a>
            <CopyButton text={SITE.directorPhone} label="Copy number" />
          </div>
          <div className="ccard">
            <div className="k">Email</div>
            <a className="v" style={{ fontSize: "1rem" }} href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <CopyButton text={SITE.email} label="Copy email" />
          </div>
        </div>
        <div className="wrap" style={{ marginTop: 16 }}>
          <div className="ccard"><div className="k">Find us</div><div className="v">Eastrise, Chipata · Eastern Province, Zambia</div></div>
        </div>
      </section>
    </>
  );
}
