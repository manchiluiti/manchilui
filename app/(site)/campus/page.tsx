import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Campus" };

// Put photos in /public/campus and swap these placeholders for <Image> tags.
const PHOTOS = ["Classroom photo", "Front of building", "Students in a practical session"];

export default function Campus() {
  return (
    <div className="page-soft">
      <PageHeader eyebrow="Campus" title="Our Home in Eastrise, Chipata" sub="Within easy reach of town and the main road to the Mwami border." />
      <section className="sec">
        <div className="wrap">
          <div className="grid3">{PHOTOS.map((p) => <div key={p} className="ph">{p}</div>)}</div>
          <div className="panel" style={{ marginTop: 32 }}>
            <h2>Learning Space</h2>
            <p>Classrooms are set up for small groups so every student gets direct attention. Practical sessions use the same document formats students will meet in their first jobs.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
