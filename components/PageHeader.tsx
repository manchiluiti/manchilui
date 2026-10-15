import Link from "next/link";

export default function PageHeader({ crumb, title, sub }: { crumb: string; title: string; sub?: string }) {
  return (
    <section className="phead">
      <div className="wrap">
        <div className="crumb"><Link href="/">Home</Link> / {crumb}</div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
    </section>
  );
}

export function SecHead({ children }: { children: React.ReactNode }) {
  return <div className="sec-h"><h2>{children}</h2><span className="rule" /></div>;
}
