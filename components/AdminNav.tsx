"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; mgmt?: boolean; teach?: boolean };
const TABS: Tab[] = [
  { href: "/admin", label: "Dashboard", mgmt: true },
  { href: "/admin/teaching", label: "Teaching", teach: true },
  { href: "/admin/students", label: "Students", mgmt: true },
  { href: "/admin/staff", label: "Staff", mgmt: true },
  { href: "/admin/announcements", label: "Announcements", mgmt: true },
  { href: "/admin/enquiries", label: "Enquiries", mgmt: true },
];

export default function AdminNav({ isManagement, isLecturer, newEnquiries }: { isManagement: boolean; isLecturer: boolean; newEnquiries: number }) {
  const path = usePathname();
  const on = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  const tabs = TABS.filter((t) => (t.mgmt && isManagement) || (t.teach && (isLecturer || isManagement)));
  return (
    <nav className="atabs" aria-label="Admin">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={on(t.href) ? "on" : ""}>
          {t.label}
          {t.href === "/admin/enquiries" && newEnquiries > 0 && <span className="badge">{newEnquiries}</span>}
        </Link>
      ))}
    </nav>
  );
}
