import Link from "next/link";

/** Switch between intakes on a module page. Hidden when there's only one. */
export default function IntakeTabs({ intakes, current, base }: { intakes: string[]; current: string; base: string }) {
  if (intakes.length < 2) return null;
  return (
    <nav className="seg" aria-label="Intake">
      {intakes.map((i) => (
        <Link key={i} href={`${base}?intake=${encodeURIComponent(i)}`} className={i === current ? "on" : ""}>{i}</Link>
      ))}
    </nav>
  );
}
