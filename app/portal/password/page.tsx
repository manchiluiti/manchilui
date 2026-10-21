import Link from "next/link";
import { redirect } from "next/navigation";
import ChangePassword from "@/components/ChangePassword";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Change password" };
export const dynamic = "force-dynamic";

export default async function PortalPassword() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  const { data: s } = await supabase.from("students").select("student_no,full_name").eq("user_id", user.id).maybeSingle();
  const forced = !!user.app_metadata?.must_change_password;

  return (
    <div className="login">
      <div className="wrap">
        <div className="lcard">
          <div style={{ display: "flex", justifyContent: "center" }}><Logo size={72} /></div>
          <h1>{forced ? "Choose your password" : "Change password"}</h1>
          <div className="sub">{forced ? `Welcome${s ? `, ${s.full_name.split(" ")[0]}` : ""}. For your security, set your own password before you continue.` : s?.student_no}</div>
          <ChangePassword forbidden={s?.student_no} next="/portal" submit={forced ? "Set password and continue" : "Save new password"} />
        </div>
        {!forced && <div style={{ textAlign: "center" }}><Link className="back" href="/portal">← Back to portal</Link></div>}
      </div>
    </div>
  );
}
