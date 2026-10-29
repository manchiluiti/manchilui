import Link from "next/link";
import Logo from "@/components/Logo";
import PortalNav from "@/components/PortalNav";
import { getPortal, unreadMessages } from "@/lib/portal";
import { SITE } from "@/lib/site";
import { signOut } from "../actions";

export const metadata = { title: "Student Portal" };
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, student } = await getPortal();

  if (!student) {
    return (
      <div className="login"><div className="wrap"><div className="lcard">
        <h1>Record not found</h1>
        <p style={{ textAlign: "center" }}>Your login works, but no student record is linked to it yet. Contact the office on {SITE.phone}.</p>
        <form action={signOut}><button className="btn btn-orange" style={{ width: "100%" }}>Sign out</button></form>
      </div></div></div>
    );
  }
  const unread = await unreadMessages(supabase, user.id, student.id);

  return (
    <div className="page-soft" style={{ minHeight: "100vh" }}>
      <div className="pbar">
        <div className="wrap">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Logo size={40} /><b>Student Portal</b></div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pid">{student.student_no}</span>
            <Link href="/portal/password" className="alink-light">Change password</Link>
            <form action={signOut}><button className="btn btn-orange btn-sm">Sign out</button></form>
          </div>
        </div>
      </div>
      <div className="phello">
        <div className="wrap">
          <p className="eyebrow" style={{ fontSize: ".75rem" }}>Welcome back</p>
          <h1>{student.full_name}</h1>
          <PortalNav unread={unread.length} />
        </div>
      </div>
      <div className="wrap pmain">
        {student.archived_at && (
          <div className="archived-note" style={{ position: "relative" }}>
            Your intake ({student.session}) has finished, so this portal is now read-only. You can still view your results and fees. For a printed statement or receipt, visit the office or call {SITE.phone}.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
