import ApplicationForm from "@/components/ApplicationForm";
import { IconCheck } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { SITE } from "@/lib/site";

export const metadata = { title: "Admissions" };

const DOCS = [
  "Grade 12 certificate or statement of results",
  "Copy of NRC",
  "Two passport-size photos",
  "Completed application form (given at the institute)",
];

export default function Admissions() {
  return (
    <div className="page-soft">
      <PageHeader eyebrow="Admissions" title="Start Your Application Today." sub="Apply online in a few minutes. Have your Grade 12 results and NRC ready as photos or PDFs." />
      <section className="sec">
        <div className="wrap grid2">
          <div style={{ display: "grid", gap: 32, alignContent: "start" }}>
            <div className="panel">
              <h2>How to Apply</h2>
              <div className="steps">
                <div className="step"><h3>Apply online</h3><p>Fill in the form on this page and attach your Grade 12 results and NRC. Questions? Call or WhatsApp us on {SITE.phone}.</p></div>
                <div className="step"><h3>We review your application</h3><p>The admissions office checks your documents and calls you.</p></div>
                <div className="step"><h3>Receive your acceptance letter</h3><p>It confirms your place, your start date and the fees.</p></div>
                <div className="step"><h3>Register and get portal access</h3><p>Bring your original documents to the institute in Eastrise. You receive a student ID and password for the Student Portal.</p></div>
              </div>
            </div>
            <div className="panel">
              <h2>Documents You Need</h2>
              <ul className="checklist">{DOCS.map((d) => <li key={d}><IconCheck size={20} />{d}</li>)}</ul>
            </div>
          </div>
          <ApplicationForm />
        </div>
      </section>
    </div>
  );
}
