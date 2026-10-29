import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ManifestCard from "@/components/ManifestCard";
import PageHeader from "@/components/PageHeader";
import { IconCheck } from "@/components/Icons";

export const metadata = { title: "The Programme" };

const FACTS = [
  ["Award", "Diploma"],
  ["Duration", "1 year, full time"],
  ["Assessment", "Continuous assessment and final exams"],
  ["Careers", "Clearing agent, freight forwarder, logistics clerk, own agency"],
];


export default async function Programme() {
  const supabase = await createClient();
  const { count } = await supabase.from("modules").select("code", { count: "exact", head: true });
  const facts = [...FACTS.slice(0, 2), ["Core modules", String(count ?? 7)], ...FACTS.slice(2)];
  return (
    <div className="page-soft">
      <PageHeader eyebrow="The programme" title="Diploma in Clearing & Forwarding" sub="One year of focused, practical training in how goods move across borders." />
      <section className="sec">
        <div className="wrap grid2" style={{ alignItems: "start" }}>
          <div className="panel">
            <h2>What You Will Learn</h2>
            <p>The diploma covers the full journey of goods in trade: how cargo is shipped and stored, how customs procedures work, and how a clearing and forwarding business serves its clients. Communication, safety and entrepreneurship are taught alongside the technical work.</p>
            <ul className="ticks" style={{ marginTop: 8 }}>
              <li><IconCheck /><div>Practical exercises on bills of lading, commercial invoices and customs declarations</div></li>
              <li><IconCheck /><div>Cargo handling, storage and workplace safety</div></li>
              <li><IconCheck /><div>Skills to start and run your own agency</div></li>
            </ul>
            <p style={{ color: "var(--muted)", fontSize: ".95rem" }}>The full module list and timetable are given to enrolled students in the Student Portal.</p>
          </div>
          <div style={{ display: "grid", gap: 32, alignContent: "start" }}>
          <div className="hero-visual fallback" style={{ height: "auto", minHeight: 420 }}><ManifestCard /></div>
          <div className="panel">
            <h2>At a Glance</h2>
            <div>
              {facts.map(([k, v]) => (
                <div key={k} className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>
            <Link className="btn btn-orange" href="/admissions">Apply for the Next Intake</Link>
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}
