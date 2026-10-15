import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "The Programme" };

const FACTS = [
  ["Award", "Diploma"],
  ["Duration", "6 months"],
  ["Core modules", "7"],
  ["Assessment", "Continuous assessment and final exams"],
  ["Careers", "Clearing agent, freight forwarder, logistics clerk, own agency"],
];

export default function Programme() {
  return (
    <>
      <PageHeader crumb="The Programme" title="The Programme" sub="Diploma in Clearing and Forwarding · six months · full time" />
      <section className="sec">
        <div className="wrap grid2">
          <div className="prose">
            <p>The diploma covers the full journey of goods in trade: how cargo is shipped and stored, how customs procedures work, and how a clearing and forwarding business serves its clients. Communication, safety and entrepreneurship are taught alongside the technical work.</p>
            <p>Teaching mixes classroom sessions with practical exercises on real document formats such as bills of lading, commercial invoices and customs declarations.</p>
            <p>The full module list and timetable are given to enrolled students through the Student Portal.</p>
          </div>
          <div className="panel">
            <div className="mono" style={{ color: "var(--muted)" }}>Programme at a glance</div>
            {FACTS.map(([k, v]) => (
              <div key={k} className="kv" style={{ paddingInline: 0 }}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
            <Link className="btn btn-navy" href="/admissions">Apply for the next intake</Link>
          </div>
        </div>
      </section>
    </>
  );
}
