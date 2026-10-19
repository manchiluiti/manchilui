"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/enquiries", label: "Enquiries" },
];

export default function AdminNav({ newEnquiries }: { newEnquiries: number }) {
  const path = usePathname();
  const on = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  return (
    <nav className="atabs" aria-label="Admin">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={on(t.href) ? "on" : ""}>
          {t.label}
          {t.href === "/admin/enquiries" && newEnquiries > 0 && <span className="badge">{newEnquiries}</span>}
        </Link>
      ))}
    </nav>
  );
}
