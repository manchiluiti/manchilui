import Link from "next/link";
import Logo from "./Logo";
import { PAGES, SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap cols">
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Logo size={44} />
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{SITE.name}</div>
          </div>
          <p>A clearing and forwarding school in Eastrise, Chipata, training Zambia&apos;s next generation of trade and customs professionals.</p>
        </div>
        <div>
          <div className="fh">Quick links</div>
          <div className="flinks">
            {PAGES.filter((p) => p.href !== "/").map((p) => (
              <Link key={p.href} href={p.href}>{p.label}</Link>
            ))}
            <Link href="/portal">Student Portal</Link>
          </div>
        </div>
        <div>
          <div className="fh">Contact</div>
          <div className="flinks" style={{ gap: 4 }}>
            <a href={`tel:${SITE.directorPhone.replace(/\s/g, "")}`}>Director: {SITE.directorPhone}</a>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <span style={{ opacity: 0.8 }}>Eastrise, Chipata<br />Eastern Province, Zambia</span>
          </div>
        </div>
      </div>
      <div className="fbot">
        <div className="wrap"><span>© {new Date().getFullYear()} {SITE.name}</span></div>
      </div>
    </footer>
  );
}
