"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PAGES } from "@/lib/site";

export default function NavBar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = (extra = "") =>
    PAGES.map((p) => (
      <Link key={p.href} href={p.href} className={path === p.href ? "on" : ""} onClick={() => setOpen(false)}>
        {extra ? <span className={extra} style={{ display: "block" }}>{p.label}</span> : p.label}
      </Link>
    ));

  return (
    <nav className="nav" aria-label="Main">
      <div className="wrap">
        <div className="navlinks">{links()}</div>
        <button className="menu-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          Menu
        </button>
      </div>
      <div className={`mmenu ${open ? "open" : ""}`}>{links("wrap")}</div>
    </nav>
  );
}
