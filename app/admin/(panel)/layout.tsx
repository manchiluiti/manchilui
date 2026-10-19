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
        <p style={{ textAlign: "center" }}>You&apos;re signed in as {user.email}, which isn&apos;t a staff account.</p>
        <form action={staffSignOut}><button className="btn btn-navy">Sign out</button></form>
      </div></div></div>
    );
  }

  const { count } = await staff.supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("handled", false);

  return (
    <div className="admin">
      <header className="abar">
        <div className="wrap abar-row">
          <Link href="/admin" className="brand"><Logo size={40} /><b>Manchilui Admin</b></Link>
          <div className="abar-r">
            <span className="who">{staff.name}</span>
            <Link href="/" className="alink">View site</Link>
            <form action={staffSignOut}><button className="btn btn-orange btn-sm">Sign out</button></form>
          </div>
        </div>
        <div className="wrap"><AdminNav newEnquiries={count ?? 0} /></div>
      </header>
      <main className="wrap amain">{children}</main>
    </div>
  );
}
