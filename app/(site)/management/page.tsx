import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Management" };

// Replace names as they are confirmed.
const PEOPLE = [
  { role: "Director", name: "Name to be added", initials: "D" },
  { role: "Head of Studies", name: "Name to be added", initials: "HS" },
  { role: "Administrator", name: "Name to be added", initials: "A" },
];

export default function Management() {
  return (
    <div className="page-soft">
      <PageHeader eyebrow="Management" title="The People Behind Manchilui" sub="The team that runs the institute and supports every student." />
      <section className="sec">
        <div className="wrap grid3">
          {PEOPLE.map((p) => (
            <div key={p.role} className="panel person">
              <div className="avatar">{p.initials}</div>
              <div><div className="role">{p.role}</div><h3>{p.name}</h3></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
