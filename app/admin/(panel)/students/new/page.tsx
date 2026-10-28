import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { managementPage } from "@/lib/admin";
import { nextStudentId } from "@/lib/site";
import { createStudent } from "../../../actions";
import PasswordInput from "@/components/PasswordInput";

export default async function NewStudent() {
  const { supabase } = await managementPage();
  const year = new Date().getFullYear();
  const { data } = await supabase.from("students").select("student_no").like("student_no", `${year}%`);
  const nextId = nextStudentId((data ?? []).map((d) => d.student_no), year);

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
              <div className="field"><label htmlFor="n-pw">Portal password (optional)</label><PasswordInput id="n-pw" name="password" autoComplete="new-password" placeholder="Blank = student ID" /></div>
            </div>
            <p className="hint">Leave the password blank and the student signs in with their ID as both username and password, then must choose their own password. All seven modules are added automatically.</p>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
