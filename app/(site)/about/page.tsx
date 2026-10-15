import PageHeader from "@/components/PageHeader";

export const metadata = { title: "About Us" };

const PILLARS = [
  ["Mission", "To train competent, honest clearing and forwarding professionals for Zambia's trade sector."],
  ["Vision", "To be the leading trade training institute in the Eastern Province."],
  ["Values", "Integrity, accuracy, service and discipline."],
  ["Approach", "Small classes, practical tasks and lecturers with trade experience."],
];

export default function About() {
  return (
    <>
      <PageHeader crumb="About Us" title="About Us" sub="A specialist clearing and forwarding school serving Chipata and the Eastern Province." />
      <section className="sec">
        <div className="wrap grid2">
          <div className="prose">
            <p>Manchilui Training Institute was founded to give young people in the Eastern Province a direct route into the clearing and forwarding trade. Chipata sits on one of Zambia&apos;s busiest trade corridors, and local businesses need people who can process goods correctly and on time.</p>
            <p>The institute focuses on one programme and teaches it well. Students learn the procedures, the documents and the professional habits that clearing agencies, freight forwarders and transport companies look for.</p>
          </div>
          <div className="grid2" style={{ gap: 14 }}>
            {PILLARS.map(([h, p]) => (
              <div key={h} className="qcard" style={{ cursor: "default" }}><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
