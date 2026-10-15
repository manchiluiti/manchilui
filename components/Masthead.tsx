import Link from "next/link";
import Logo from "./Logo";
import { SITE } from "@/lib/site";

export default function Masthead() {
  return (
    <header className="mast">
      <div className="wrap">
        <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
          <Logo size={50} />
          <span>
            <span className="n1" style={{ display: "block" }}>{SITE.name}</span>
            <span className="n2">{SITE.place}</span>
          </span>
        </Link>
        <div className="mast-r">
          <Link className="btn btn-gold" href="/portal">Student Portal</Link>
        </div>
      </div>
    </header>
  );
}
