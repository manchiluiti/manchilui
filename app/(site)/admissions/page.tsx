import EnquiryForm from "@/components/EnquiryForm";
import PageHeader, { SecHead } from "@/components/PageHeader";
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
    <>
      <PageHeader crumb="Admissions" title="Admissions" sub="Applications are open for the next intake. Here is how to apply." />
      <section className="sec">
        <div className="wrap grid2">
          <div>
            <SecHead>How to apply</SecHead>
            <div className="steps">
              <div className="step"><h3>Send an enquiry</h3><p>Use the form on this page or call the Director on {SITE.directorPhone}.</p></div>
              <div className="step"><h3>Bring your documents</h3><p>Visit the institute in Eastrise with the documents listed below.</p></div>
              <div className="step"><h3>Receive your acceptance letter</h3><p>It confirms your place, your start date and the fees.</p></div>
              <div className="step" style={{ paddingBottom: 0 }}><h3>Register and get portal access</h3><p>You receive a student ID and password for the Student Portal.</p></div>
            </div>
            <div style={{ marginTop: 28 }}>
              <SecHead>Documents to bring</SecHead>
              <ul className="checklist">{DOCS.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          </div>
          <EnquiryForm />
        </div>
      </section>
    </>
  );
}
