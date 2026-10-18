"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { IconMenu, IconX } from "./Icons";
import { PAGES, SITE } from "@/lib/site";

export default function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const isOn = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <>
      <header className="header">
        <div className="wrap header-row">
          <Link href="/" className="brand" onClick={() => setOpen(false)} aria-label={`${SITE.name} home`}>
            <Logo size={56} />
            <span className="brand-text">
              <span className="brand-name">Manchilui</span>
              <span className="brand-sub">Training Institute</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Main">
            {PAGES.map((p) => (
              <Link key={p.href} href={p.href} className={isOn(p.href) ? "on" : ""}>{p.label}</Link>
            ))}
          </nav>

          <div className="header-actions">
            <Link href="/portal" className="btn btn-orange btn-sm">Student Portal</Link>
            <button className="burger" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
              {open ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        <div className={`drawer ${open ? "open" : ""}`}>
          <nav className="wrap">
            {PAGES.map((p) => (
              <Link key={p.href} href={p.href} onClick={() => setOpen(false)} className={`link ${isOn(p.href) ? "on" : ""}`}>{p.label}</Link>
            ))}
            <Link href="/portal" onClick={() => setOpen(false)} className="btn btn-orange">Student Portal</Link>
          </nav>
        </div>
      </header>
      <div className="header-spacer" />
    </>
  );
}
