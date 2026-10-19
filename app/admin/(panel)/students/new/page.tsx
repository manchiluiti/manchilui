import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { requireStaff } from "@/lib/admin";
import { createStudent } from "../../../actions";

export default async function NewStudent() {
  const { supabase } = await requireStaff();
  const year = new Date().getFullYear();
  const { data } = await supabase.from("students").select("student_no").like("student_no", `MTI-${year}-%`).order("student_no", { ascending: false }).limit(1);
  const last = data?.[0]?.student_no ? Number(data[0].student_no.slice(-3)) : 0;
  const nextId = `MTI-${year}-${String(last + 1).padStart(3, "0")}`;

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href="/admin/students">Students</Link> / New</p><h1>Add a student</h1></div>
      </div>
      <div className="rec" style={{ maxWidth: 720 }}>
        <div className="rec-b" style={{ paddingBlock: 24 }}>
          <ActionForm action={createStudent} submit="Create student and login">
            <div className="fgrid">
              <div className="field"><label htmlFor="n-id">Student ID</label><input id="n-id" name="student_no" defaultValue={nextId} /></div>
              <div className="field"><label htmlFor="n-name">Full name</label><input id="n-name" name="full_name" autoComplete="off" /></div>
              <div className="field"><label htmlFor="n-phone">Phone (optional)</label><input id="n-phone" name="phone" inputMode="tel" placeholder="+260" /></div>
              <div className="field"><label htmlFor="n-session">Session</label><input id="n-session" name="session" placeholder="January – June 2027" /></div>
              <div className="field"><label htmlFor="n-fees">Fees balance (K)</label><input id="n-fees" name="fees_balance" inputMode="decimal" defaultValue="0" /></div>
              <div className="field"><label htmlFor="n-pw">Portal password</label><input id="n-pw" name="password" autoComplete="new-password" placeholder="At least 6 characters" /></div>
            </div>
            <p className="hint">The student signs in at Student Portal with the ID and this password. All seven modules are added automatically.</p>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
