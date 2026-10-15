import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Campus" };

// Put photos in /public/campus and swap these placeholders for <Image> tags.
const PHOTOS = ["Classroom photo", "Front of building", "Students in practical session"];

export default function Campus() {
  return (
    <>
      <PageHeader crumb="Campus" title="Campus" sub="Our premises in Eastrise, Chipata." />
      <section className="sec">
        <div className="wrap">
          <div className="grid3">{PHOTOS.map((p) => <div key={p} className="ph">{p}</div>)}</div>
          <div className="prose" style={{ marginTop: 24 }}>
            <p>The institute is in Eastrise, Chipata, within easy reach of town and the main road to the Mwami border. Classrooms are set up for small groups so every student gets direct attention.</p>
          </div>
        </div>
      </section>
    </>
  );
}
