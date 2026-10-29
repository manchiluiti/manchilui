"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; mgmt?: boolean; teach?: boolean; lect?: boolean; all?: boolean };
const TABS: Tab[] = [
  { href: "/admin", label: "Dashboard", mgmt: true },
  { href: "/admin/teaching", label: "Teaching", teach: true },
  { href: "/admin/students", label: "Students", mgmt: true },
  { href: "/admin/modules", label: "Modules", mgmt: true },
  { href: "/admin/staff", label: "Staff", mgmt: true },
  { href: "/admin/payroll", label: "Payroll", mgmt: true },
  { href: "/admin/messages", label: "Messages", mgmt: true },
  { href: "/admin/announcements", label: "Announcements", mgmt: true },
  { href: "/admin/applications", label: "Applications", mgmt: true },
  { href: "/admin/enquiries", label: "Enquiries", mgmt: true },
  { href: "/admin/activity", label: "Activity", mgmt: true },
  { href: "/admin/settings", label: "Settings", mgmt: true },
  { href: "/admin/inbox", label: "Inbox", lect: true },
  { href: "/admin/pay", label: "My pay", all: true },
];

export default function AdminNav({ isManagement, isLecturer, newEnquiries, unread }: { isManagement: boolean; isLecturer: boolean; newEnquiries: number; unread: number }) {
  const path = usePathname();
  const on = (h: string) => (h === "/admin" ? path === "/admin" : path === h || path.startsWith(h + "/"));
  const tabs = TABS.filter((t) => (t.mgmt && isManagement) || (t.teach && (isLecturer || isManagement)) || (t.lect && isLecturer) || !!t.all);
  return (
    <nav className="atabs" aria-label="Admin">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={on(t.href) ? "on" : ""}>
          {t.label}
          {t.href === "/admin/enquiries" && newEnquiries > 0 && <span className="badge">{newEnquiries}</span>}
          {t.href === "/admin/inbox" && unread > 0 && <span className="badge">{unread}</span>}
        </Link>
      ))}
    </nav>
  );
}
