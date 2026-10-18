export default function PageHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <section className="banner">
      <div className="wrap">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
    </section>
  );
}

export function SecHead({ eyebrow, title, sub, left }: { eyebrow: string; title: string; sub?: string; left?: boolean }) {
  return (
    <div className={`sec-head ${left ? "left" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}
