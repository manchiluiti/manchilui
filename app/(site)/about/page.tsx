import PageHeader from "@/components/PageHeader";
import { IconCheck, IconEye, IconShield, IconTarget } from "@/components/Icons";

export const metadata = { title: "About Us" };

const PILLARS = [
  { h: "Our Mission", p: "To train competent, honest clearing and forwarding professionals for Zambia's trade sector.", Icon: IconTarget },
  { h: "Our Vision", p: "To be the leading trade training institute in the Eastern Province.", Icon: IconEye },
  { h: "Our Values", p: "Integrity, accuracy, service and discipline in everything we teach.", Icon: IconShield },
];

export default function About() {
  return (
    <div className="page-soft">
      <PageHeader eyebrow="About us" title="Training Zambia's Next Trade Professionals." sub="A specialist clearing and forwarding school serving Chipata and the Eastern Province." />
      <section className="sec">
        <div className="wrap grid2">
          <div className="panel">
            <h2>Who We Are</h2>
            <p>Manchilui Training Institute gives young people in the Eastern Province a direct route into the clearing and forwarding trade. Chipata sits on one of Zambia&apos;s busiest trade corridors, and local businesses need people who can process goods correctly and on time.</p>
            <p>We focus on one programme and teach it well. Students learn the procedures, the documents and the professional habits that clearing agencies, freight forwarders and transport companies look for.</p>
          </div>
          <div className="panel">
            <h2>Why Students Choose Us</h2>
            <ul className="ticks">
              <li><IconCheck /><div><b>Practical teaching</b>Classes are built around the paperwork you will handle at work.</div></li>
              <li><IconCheck /><div><b>Small classes</b>Lecturers know every student by name.</div></li>
              <li><IconCheck /><div><b>Close to the border</b>Learn where the trade happens, near Mwami.</div></li>
              <li><IconCheck /><div><b>Six months to qualify</b>A focused diploma, not years of study.</div></li>
            </ul>
          </div>
        </div>
        <div className="wrap grid3" style={{ marginTop: 32 }}>
          {PILLARS.map(({ h, p, Icon }) => (
            <div key={h} className="fcard static">
              <div className="ficon"><Icon size={28} /></div>
              <h3 style={{ fontSize: "1.25rem" }}>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
