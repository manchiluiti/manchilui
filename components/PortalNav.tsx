"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const TABS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/results", label: "Results" },
  { href: "/portal/fees", label: "Fees & payments" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/notes", label: "Notes" },
];

export default function PortalNav({ unread }: { unread: number }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.querySelector("a.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  return (
    <nav ref={ref} className="atabs ptabs" aria-label="Student portal">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href ? "on" : ""}>
          {t.label}
          {t.href === "/portal/messages" && unread > 0 && <span className="badge">{unread}</span>}
        </Link>
      ))}
    </nav>
  );
}
