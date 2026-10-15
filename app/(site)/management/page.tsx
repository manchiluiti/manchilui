import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Management" };

// Replace names as they are confirmed.
const PEOPLE = [
  { role: "Director", name: "Name to be added" },
  { role: "Head of Studies", name: "Name to be added" },
  { role: "Administrator", name: "Name to be added" },
];

const initials = (role: string) => role.split(" ").filter((w) => w.length > 2).map((w) => w[0]).join("").slice(0, 2);

export default function Management() {
  return (
    <>
      <PageHeader crumb="Management" title="Management" sub="The people who run the institute." />
      <section className="sec">
        <div className="wrap grid3">
          {PEOPLE.map((p) => (
            <div key={p.role} className="person">
              <div className="avatar">{initials(p.role)}</div>
              <div><div className="role">{p.role}</div><h3>{p.name}</h3></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
