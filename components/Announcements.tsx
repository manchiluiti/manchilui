export type Announcement = { id: string; title: string; body: string; posted_on: string };

export default function Announcements({ items, empty }: { items: Announcement[]; empty: string }) {
  if (!items.length) return <p style={{ color: "var(--muted)" }}>{empty}</p>;
  return (
    <div className="ann">
      {items.map((a) => {
        const d = new Date(a.posted_on + "T00:00:00");
        return (
          <div className="ann-item" key={a.id}>
            <div className="date">
              <div className="d">{String(d.getDate()).padStart(2, "0")}</div>
              <div className="m">{d.toLocaleString("en-GB", { month: "short" }).toUpperCase()}</div>
            </div>
            <div><h3>{a.title}</h3><p>{a.body}</p></div>
          </div>
        );
      })}
    </div>
  );
}
