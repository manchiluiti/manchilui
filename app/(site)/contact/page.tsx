import CopyButton from "@/components/CopyButton";
import { IconClock, IconMail, IconPhone, IconPin } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/site";

export const metadata = { title: "Contact" };

export default function Contact() {
  const tel = SITE.phone.replace(/\s/g, "");
  return (
    <div className="page-soft">
      <PageHeader eyebrow="Contact us" title="We'd Love to Hear From You." sub="Call, WhatsApp, email or visit us in Eastrise, Chipata." />
      <section className="sec">
        <div className="wrap grid2">
          <div className="panel" style={{ gap: 28 }}>
            <h2>Get in Touch</h2>
            <div className="cinfo">
              <div className="ficon"><IconPhone size={24} /></div>
              <div><div className="k">Call / WhatsApp</div><a className="v" href={`tel:${tel}`}>{SITE.phone}</a><br /><CopyButton text={SITE.phone} label="Copy number" /></div>
            </div>
            <div className="cinfo">
              <div className="ficon"><IconMail size={24} /></div>
              <div><div className="k">Email</div><a className="v" href={`mailto:${SITE.email}`}>{SITE.email}</a><br /><CopyButton text={SITE.email} label="Copy email" /></div>
            </div>
            <div className="cinfo">
              <div className="ficon"><IconPin size={24} /></div>
              <div><div className="k">Visit us</div><div className="v">{SITE.address}</div></div>
            </div>
          </div>
          <div className="panel">
            <h2>Office Hours</h2>
            <div>
              <div className="kv"><span className="k">Mon – Fri</span><span className="v">08:00 – 17:00</span></div>
              <div className="kv"><span className="k">Saturday</span><span className="v">08:00 – 13:00</span></div>
              <div className="kv"><span className="k">Sunday</span><span className="v">Closed</span></div>
            </div>
            <div className="cinfo" style={{ marginTop: 8 }}>
              <div className="ficon"><IconClock size={24} /></div>
              <p style={{ lineHeight: 1.6 }}>The fastest way to reach us is WhatsApp. Tap the green button at the bottom of any page.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
