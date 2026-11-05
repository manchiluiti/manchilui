import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <div className="page-soft">
      <PageHeader eyebrow="Privacy" title="Privacy Policy" sub="How Manchilui Training Institute handles your information." />
      <section className="sec">
        <div className="wrap">
          <div className="panel" style={{ maxWidth: 820 }}>
            <p className="hint">Last updated: 5 November 2026</p>
            <h2>What we collect</h2>
            <p>When you apply or enquire, we collect the details you give us: your name, phone number, email, town, preferred intake and the documents you attach (such as your NRC and school results). For registered students we also keep fees, payments, results and messages sent through the student portal. For staff we keep the details needed for payroll.</p>
            <h2>How we use it</h2>
            <p>We use this information only to process applications, run the student and staff portals, keep academic and fee records, and contact you by phone, SMS or email about your studies or application. We do not sell or share your information with advertisers.</p>
            <h2>Where it is stored</h2>
            <p>Records are stored securely with our service providers: Supabase (database and file storage), Vercel (website hosting), Africa&apos;s Talking (SMS) and Google Drive (copies of registered students&apos; documents). Only authorised Manchilui staff can see your records, and students can only see their own.</p>
            <h2>Google Drive</h2>
            <p>The Manchilui system connects to the institute&apos;s own Google account only to save and open files it creates itself (student documents and lecture notes). It does not read, change or share any other files in that account.</p>
            <h2>How long we keep it</h2>
            <p>Student academic records are kept so we can confirm results and issue statements in future. Applications that are not accepted are deleted after a reasonable period.</p>
            <h2>Your choices</h2>
            <p>You can ask to see or correct your information, or ask us to delete it where we are not required to keep it, by contacting the office.</p>
            <h2>Contact</h2>
            <p>{SITE.name}, {SITE.address}. Phone {SITE.phone}. Email <a className="copy" href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
