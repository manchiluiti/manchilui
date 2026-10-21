import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import Logo from "@/components/Logo";
import { getStaff } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { staffSignOut } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/admin/login");
    return (
      <div className="login"><div className="wrap"><div className="lcard">
        <h1>No staff access</h1>
        <p style={{ textAlign: "center" }}>You&apos;re signed in as {user.email}, which doesn&apos;t have staff access. Ask management to give you a role.</p>
        <form action={staffSignOut}><button className="btn btn-navy">Sign out</button></form>
      </div></div></div>
    );
  }

  const { count } = staff.isManagement
    ? await staff.supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("handled", false)
    : { count: 0 };
  let unread = 0;
  if (staff.isLecturer) {
    const { data: mine } = await staff.supabase.from("messages").select("id")
      .or(`and(audience.eq.staff,staff_id.eq.${staff.user.id}),audience.eq.all_lecturers`);
    const ids = (mine ?? []).map((m) => m.id);
    if (ids.length) {
      const { data: reads } = await staff.supabase.from("message_reads").select("message_id").eq("user_id", staff.user.id).in("message_id", ids);
      unread = ids.length - (reads ?? []).length;
    }
  }
  const role = staff.isManagement && staff.isLecturer ? "Management · Lecturer" : staff.isManagement ? "Management" : "Lecturer";

  return (
    <div className="admin">
      <header className="abar">
        <div className="wrap abar-row">
          <Link href="/admin" className="brand"><Logo size={40} /><b>Manchilui Admin</b></Link>
          <div className="abar-r">
            <span className="who">{staff.name} <em>{role}</em></span>
            <Link href="/admin/account" className="alink">My account</Link>
            <Link href="/" className="alink">View site</Link>
            <form action={staffSignOut}><button className="btn btn-orange btn-sm">Sign out</button></form>
          </div>
        </div>
        <div className="wrap"><AdminNav isManagement={staff.isManagement} isLecturer={staff.isLecturer} newEnquiries={count ?? 0} unread={unread} /></div>
      </header>
      <main className="wrap amain">{children}</main>
    </div>
  );
}
