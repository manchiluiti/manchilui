import { redirect } from "next/navigation";
import ChangePassword from "@/components/ChangePassword";
import { getStaff } from "@/lib/admin";

export default async function Account() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>My account</p><h1>Change password</h1></div></div>
      <section className="rec" style={{ maxWidth: 520 }}>
        <div className="rec-h"><div><h2>{staff.name}</h2><small className="sub">{staff.user.email}</small></div></div>
        <div className="rec-b" style={{ paddingBlock: 20 }}>
          <ChangePassword next="/admin/teaching" />
        </div>
      </section>
    </>
  );
}
