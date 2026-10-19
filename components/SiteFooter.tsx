import Link from "next/link";
import Logo from "./Logo";
import { IconClock, IconMail, IconPhone, IconPin } from "./Icons";
import { PAGES, SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <div className="fbrand">
            <Logo size={52} />
            <div className="fname">Manchilui<span>.</span></div>
          </div>
          <p className="ftag">A clearing and forwarding training institute in Eastrise, Chipata, preparing young Zambians for careers at border posts, ports and freight agencies.</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <ul>
            {PAGES.filter((p) => p.href !== "/").map((p) => (
              <li key={p.href}><Link href={p.href}>{p.label}</Link></li>
            ))}
            <li><Link href="/portal" style={{ color: "#fff", fontWeight: 600 }}>Student Portal →</Link></li>
          </ul>
        </div>

        <div>
          <h4><IconClock size={18} /> Office Hours</h4>
          <ul className="hours">
            <li><small>Monday – Friday</small><b>08:00 – 17:00</b></li>
            <li><small>Saturday</small><b>08:00 – 13:00</b></li>
            <li><small>Sunday &amp; Public Holidays</small><b>Closed</b></li>
          </ul>
        </div>

        <div>
          <h4>Contact Info</h4>
          <ul>
            <li className="ci"><IconPin size={18} /><span>{SITE.address}</span></li>
            <li className="ci"><IconMail size={18} /><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
            <li className="ci"><IconPhone size={18} /><a href={`tel:${SITE.directorPhone.replace(/\s/g, "")}`}>{SITE.directorPhone}</a></li>
          </ul>
        </div>
      </div>
      <div className="fbottom">
        <div className="wrap">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Eastrise · Chipata · Eastern Province · <Link className="staff-link" href="/admin">Staff</Link></p>
        </div>
      </div>
    </footer>
  );
}
