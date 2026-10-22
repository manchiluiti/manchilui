"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminAuth, MODULE_STATUSES, PAY_METHODS, requireManagement, requireModuleAccess, requireStaff, STATUSES,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_EMAIL_DOMAIN, STUDENT_ID_HINT, STUDENT_ID_RE, studentIdToEmail } from "@/lib/site";
import { monthLabel, normalizePhone, sendSms, templates } from "@/lib/sms";

export type FormState = { ok?: string; error?: string } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const money = (v: string) => {
  const n = Number(v.replace(/[,\sK]/gi, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};
/** "" -> null, "72.5" -> 72.5, anything outside 0–100 -> NaN */
const markVal = (v: string) => {
  if (v === "") return null;
  const n = Number(v.replace("%", ""));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : NaN;
};
const fail = (e: unknown): FormState => ({ error: e instanceof Error ? e.message : "Something went wrong. Try again." });
const refresh = () => revalidatePath("/", "layout");

/** Student login. With no password given, the student ID is the first password and must be changed at first sign-in. */
async function createStudentLogin(auth: ReturnType<typeof adminAuth>, studentNo: string, password: string) {
  const temp = !password;
  return auth.createUser({
    email: studentIdToEmail(studentNo),
    password: temp ? studentNo.toUpperCase() : password,
    email_confirm: true,
    app_metadata: { must_change_password: temp },
  });
}

export async function staffSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* =================== Management: students =================== */

export async function createStudent(_: FormState, fd: FormData): Promise<FormState> {
  let newId = "";
  try {
    const { supabase } = await requireManagement();
    const student_no = str(fd, "student_no").toUpperCase();
    const full_name = str(fd, "full_name");
    const session = str(fd, "session");
    const phone = str(fd, "phone") || null;
    const fees_balance = money(str(fd, "fees_balance") || "0");
    const password = String(fd.get("password") ?? "");

    if (!STUDENT_ID_RE.test(student_no)) return { error: `Student ID must be ${STUDENT_ID_HINT}.` };
    if (full_name.length < 2) return { error: "Enter the student's full name." };
    if (!session) return { error: "Enter the session, for example January – June 2027." };
    if (Number.isNaN(fees_balance)) return { error: "Fees balance must be a number, for example 2500." };
    if (password && password.length < 8) return { error: "Password must be at least 8 characters, or leave it blank to use the student ID." };

    const auth = adminAuth();

    const { data: row, error } = await supabase.from("students").insert({ student_no, full_name, session }).select("id").single();
    if (error) return { error: error.code === "23505" ? `${student_no} is already taken. Use the next number.` : error.message };

    // The account row is created by a trigger; fill in the private details.
    const { error: accErr } = await supabase.from("student_accounts").upsert({ student_id: row.id, fees_balance, phone });
    if (accErr) {
      await supabase.from("students").delete().eq("id", row.id);
      return { error: accErr.message };
    }

    const { error: authErr } = await createStudentLogin(auth, student_no, password);
    if (authErr) {
      await supabase.from("students").delete().eq("id", row.id);
      return { error: `The login couldn't be created: ${authErr.message}` };
    }
    newId = row.id;
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/admin/students/${newId}?created=1`);
}

export async function updateStudent(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const status = str(fd, "status");
    const fees_balance = money(str(fd, "fees_balance"));
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { error: "Choose a valid status." };
    if (Number.isNaN(fees_balance)) return { error: "Fees balance must be a number." };
    const full_name = str(fd, "full_name");
    if (full_name.length < 2) return { error: "Enter the student's full name." };

    const { error } = await supabase.from("students").update({ full_name, session: str(fd, "session"), status }).eq("id", id);
    if (error) return { error: error.message };
    const { error: e2 } = await supabase.from("student_accounts").upsert({
      student_id: id, fees_balance, phone: str(fd, "phone") || null, remark: str(fd, "remark") || null, updated_at: new Date().toISOString(),
    });
    if (e2) return { error: e2.message };
    refresh();
    return { ok: "Details saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function recordPayment(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const amount = money(str(fd, "amount"));
    const method = str(fd, "method");
    if (!(amount > 0)) return { error: "Enter an amount greater than zero." };
    if (!PAY_METHODS.includes(method as (typeof PAY_METHODS)[number])) return { error: "Choose how it was paid." };
    const { data, error } = await supabase.rpc("record_payment", {
      p_student: id, p_amount: amount, p_method: method, p_reference: str(fd, "reference"), p_paid_on: str(fd, "paid_on") || null,
    });
    if (error) return { error: error.message };
    refresh();
    return { ok: `Payment recorded. New balance: K ${Number(data).toLocaleString("en-ZM", { minimumFractionDigits: 2 })}` };
  } catch (e) {
    return fail(e);
  }
}

export async function setPassword(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const password = String(fd.get("password") ?? "");
    if (password && password.length < 8) return { error: "Password must be at least 8 characters, or leave it blank to reset to the student ID." };
    const { data: s, error } = await supabase.from("students").select("student_no,user_id").eq("id", id).single();
    if (error) return { error: error.message };
    const auth = adminAuth();
    const temp = !password;
    if (s.user_id) {
      const { error: e2 } = await auth.updateUserById(s.user_id, {
        password: temp ? s.student_no : password,
        app_metadata: { must_change_password: temp },
      });
      if (e2) return { error: e2.message };
      return { ok: temp ? `Reset. ${s.student_no} signs in with their ID as the password and must choose a new one.` : `Password changed. Give ${s.student_no} the new password.` };
    }
    const { error: e3 } = await createStudentLogin(auth, s.student_no, password);
    if (e3) return { error: e3.message };
    refresh();
    return { ok: temp ? `Login created. ${s.student_no} signs in with their ID as the password the first time.` : `Login created for ${s.student_no}.` };
  } catch (e) {
    return fail(e);
  }
}

/* =================== Marks (lecturers for their modules, management for all) =================== */

type MarkRow = { student_id: string; module_code: string; ca_mark: number | null; exam_mark: number | null; status: string };

async function saveMarkRows(rows: MarkRow[], supabase: Awaited<ReturnType<typeof createClient>>): Promise<FormState> {
  let changed = 0;
  for (const r of rows) {
    const { data, error } = await supabase
      .from("student_modules")
      .update({ ca_mark: r.ca_mark, exam_mark: r.exam_mark, status: r.status })
      .eq("student_id", r.student_id)
      .eq("module_code", r.module_code)
      .select("student_id");
    if (error) return { error: error.message };
    changed += data?.length ?? 0;
  }
  if (rows.length && changed === 0) return { error: "Nothing was saved. You may not be assigned to this module." };
  return null;
}

function readMark(fd: FormData, key: string, label: string): number | null | string {
  const v = markVal(str(fd, key));
  if (Number.isNaN(v)) return `${label} must be a number from 0 to 100, or left blank.`;
  return v as number | null;
}

/** Module page: one module, many students. */
export async function saveModuleMarks(code: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireModuleAccess(code);
    const rows: MarkRow[] = [];
    for (const sid of fd.getAll("sid").map(String)) {
      const name = str(fd, `name_${sid}`) || "A student";
      const ca = readMark(fd, `ca_${sid}`, `${name}'s CA`);
      const ex = readMark(fd, `exam_${sid}`, `${name}'s exam`);
      if (typeof ca === "string") return { error: ca };
      if (typeof ex === "string") return { error: ex };
      const status = str(fd, `status_${sid}`);
      rows.push({ student_id: sid, module_code: code, ca_mark: ca, exam_mark: ex, status: MODULE_STATUSES.includes(status as never) ? status : "In progress" });
    }
    const err = await saveMarkRows(rows, supabase);
    if (err) return err;
    refresh();
    return { ok: "Marks saved. Students can see them now." };
  } catch (e) {
    return fail(e);
  }
}

/** Student page (management): one student, all modules. */
export async function saveStudentMarks(studentId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const rows: MarkRow[] = [];
    for (const code of fd.getAll("code").map(String)) {
      const ca = readMark(fd, `ca_${code}`, `${code} CA`);
      const ex = readMark(fd, `exam_${code}`, `${code} exam`);
      if (typeof ca === "string") return { error: ca };
      if (typeof ex === "string") return { error: ex };
      const status = str(fd, `status_${code}`);
      rows.push({ student_id: studentId, module_code: code, ca_mark: ca, exam_mark: ex, status: MODULE_STATUSES.includes(status as never) ? status : "Not started" });
    }
    const err = await saveMarkRows(rows, supabase);
    if (err) return err;
    refresh();
    return { ok: "Marks saved." };
  } catch (e) {
    return fail(e);
  }
}

/* =================== Notes and classes =================== */

export async function addNote(code: string, note: { title: string; path: string; name: string; size: number }): Promise<FormState> {
  try {
    const { supabase } = await requireModuleAccess(code);
    if (note.title.trim().length < 2) return { error: "Give the note a title." };
    if (!note.path.startsWith(`${code}/`)) return { error: "File was uploaded to the wrong module." };
    const { error } = await supabase.from("notes").insert({ module_code: code, title: note.title.trim(), file_path: note.path, file_name: note.name, file_size: note.size });
    if (error) {
      await supabase.storage.from("notes").remove([note.path]);
      return { error: error.message };
    }
    refresh();
    return { ok: "Note uploaded. Students can download it now." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNote(id: string) {
  const { supabase } = await requireStaff();
  const { data: n } = await supabase.from("notes").select("file_path").eq("id", id).maybeSingle();
  if (!n) return;
  await supabase.storage.from("notes").remove([n.file_path]); // file first: the storage rule checks the note's uploader
  await supabase.from("notes").delete().eq("id", id);
  refresh();
}

export async function createClass(code: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireModuleAccess(code);
    const title = str(fd, "title");
    const when = str(fd, "starts_at"); // "2026-10-21T14:00" in Zambian time
    const duration_min = Number(str(fd, "duration_min") || "60");
    const meeting_url = str(fd, "meeting_url") || null;
    if (title.length < 2) return { error: "Give the class a title, for example Week 3: Customs valuation." };
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return { error: "Choose the date and start time." };
    if (meeting_url && !/^https:\/\//.test(meeting_url)) return { error: "The class link must start with https://" };
    if (!(duration_min >= 15 && duration_min <= 480)) return { error: "Duration must be between 15 and 480 minutes." };
    const { error } = await supabase.from("classes").insert({
      module_code: code, title, starts_at: `${when}:00+02:00`, duration_min, meeting_url, details: str(fd, "details") || null,
    });
    if (error) return { error: error.message };
    refresh();
    return { ok: "Class scheduled. Students can see it in their portal." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteClass(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("classes").delete().eq("id", id);
  refresh();
}

/* =================== Announcements =================== */

export async function createAnnouncement(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const title = str(fd, "title");
    const body = str(fd, "body");
    const audience = str(fd, "audience") === "students" ? "students" : "public";
    if (!title || !body) return { error: "Add a title and a message." };
    const { error } = await supabase.from("announcements").insert({ title, body, audience, posted_on: str(fd, "posted_on") || undefined });
    if (error) return { error: error.message };
    refresh();
    return { ok: audience === "public" ? "Posted on the website and the portal." : "Posted in the Student Portal." };
  } catch (e) {
    return fail(e);
  }
}

export async function postModuleAnnouncement(code: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireModuleAccess(code);
    const title = str(fd, "title");
    const body = str(fd, "body");
    if (!title || !body) return { error: "Add a title and a message." };
    const { error } = await supabase.from("announcements").insert({ title, body, audience: "module", module_code: code });
    if (error) return { error: error.message };
    refresh();
    return { ok: "Posted to your students." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAnnouncement(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("announcements").delete().eq("id", id);
  refresh();
}

/* =================== Enquiries =================== */

export async function setEnquiryHandled(id: string, handled: boolean) {
  const { supabase } = await requireManagement();
  await supabase.from("enquiries").update({ handled }).eq("id", id);
  refresh();
}

/* =================== Staff (management) =================== */

export async function createStaff(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const full_name = str(fd, "full_name");
    const email = str(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    const is_management = fd.get("is_management") === "on";
    const is_lecturer = fd.get("is_lecturer") === "on";
    if (full_name.length < 2) return { error: "Enter the staff member's full name." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
    if (email.endsWith(`@${STUDENT_EMAIL_DOMAIN}`)) return { error: "That address is reserved for student logins." };
    if (password.length < 8) return { error: "Staff passwords must be at least 8 characters." };
    if (!is_management && !is_lecturer) return { error: "Tick at least one role." };

    const auth = adminAuth();
    const { data, error } = await auth.createUser({ email, password, email_confirm: true });
    if (error) return { error: error.message.includes("already") ? "A login with that email already exists." : error.message };

    const { error: e2 } = await supabase.from("staff").insert({ user_id: data.user.id, full_name, email, is_management, is_lecturer });
    if (e2) {
      await auth.deleteUser(data.user.id);
      return { error: e2.message };
    }
    const modules = fd.getAll("modules").map(String);
    if (is_lecturer && modules.length) {
      await supabase.from("module_lecturers").insert(modules.map((m) => ({ module_code: m, lecturer_id: data.user.id })));
    }
    refresh();
    return { ok: `${full_name} can now sign in at /admin with ${email}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateStaff(userId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireManagement();
    const { supabase } = me;
    const is_management = fd.get("is_management") === "on";
    const is_lecturer = fd.get("is_lecturer") === "on";
    const full_name = str(fd, "full_name");
    if (userId === me.user.id && !is_management) return { error: "You can't remove your own management role. Ask another manager." };
    if (full_name.length < 2) return { error: "Enter the full name." };

    const { error } = await supabase.from("staff").update({ full_name, is_management, is_lecturer }).eq("user_id", userId);
    if (error) return { error: error.message };

    const modules = is_lecturer ? fd.getAll("modules").map(String) : [];
    await supabase.from("module_lecturers").delete().eq("lecturer_id", userId);
    if (modules.length) {
      const { error: e2 } = await supabase.from("module_lecturers").insert(modules.map((m) => ({ module_code: m, lecturer_id: userId })));
      if (e2) return { error: e2.message };
    }
    refresh();
    return { ok: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function setStaffPassword(userId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    await requireManagement();
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) return { error: "Staff passwords must be at least 8 characters." };
    const { error } = await adminAuth().updateUserById(userId, { password });
    if (error) return { error: error.message };
    return { ok: "Password changed." };
  } catch (e) {
    return fail(e);
  }
}

export async function removeStaffAccess(userId: string) {
  const me = await requireManagement();
  if (userId === me.user.id) return;
  await me.supabase.from("module_lecturers").delete().eq("lecturer_id", userId);
  await me.supabase.from("staff").update({ is_management: false, is_lecturer: false }).eq("user_id", userId);
  refresh();
}

/* =================== Grading scale (management) =================== */

export async function saveGradeScale(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const letters = fd.getAll("letter").map((v) => String(v).trim().toUpperCase());
    const rows = letters.map((letter, i) => ({
      letter,
      min_mark: Number(String(fd.getAll("min_mark")[i] ?? "").trim()),
      remark: String(fd.getAll("remark")[i] ?? "").trim(),
      is_pass: fd.get(`pass_${i}`) === "on",
    })).filter((r) => r.letter);

    if (rows.length < 2) return { error: "Keep at least two grades." };
    for (const r of rows) {
      if (!/^[A-Z][+-]?$/.test(r.letter)) return { error: `"${r.letter}" isn't a valid grade. Use letters like A, B+ or C-.` };
      if (!Number.isFinite(r.min_mark) || r.min_mark < 0 || r.min_mark > 100) return { error: `Minimum mark for ${r.letter} must be 0 to 100.` };
      if (!r.remark) return { error: `Add a remark for ${r.letter}, for example Distinction or Fail.` };
    }
    if (new Set(rows.map((r) => r.letter)).size !== rows.length) return { error: "Each grade letter can only appear once." };
    if (new Set(rows.map((r) => r.min_mark)).size !== rows.length) return { error: "Two grades have the same minimum mark." };
    if (!rows.some((r) => r.min_mark === 0)) return { error: "The lowest grade must start at 0." };

    const { error: delErr } = await supabase.from("grade_scale").delete().neq("letter", "");
    if (delErr) return { error: delErr.message };
    const { error } = await supabase.from("grade_scale").insert(rows);
    if (error) return { error: error.message };
    refresh();
    return { ok: "Grading scale saved. All grades update straight away." };
  } catch (e) {
    return fail(e);
  }
}

/* =================== Payment corrections (management) =================== */

export async function editPayment(paymentId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const amount = money(str(fd, "amount"));
    const method = str(fd, "method");
    if (!(amount > 0)) return { error: "Enter an amount greater than zero." };
    if (!PAY_METHODS.includes(method as (typeof PAY_METHODS)[number])) return { error: "Choose how it was paid." };
    const { data, error } = await supabase.rpc("update_payment", {
      p_id: paymentId, p_amount: amount, p_method: method, p_reference: str(fd, "reference"), p_paid_on: str(fd, "paid_on") || null,
    });
    if (error) return { error: error.message };
    refresh();
    return { ok: `Payment updated. Balance is now K ${Number(data).toLocaleString("en-ZM", { minimumFractionDigits: 2 })}` };
  } catch (e) {
    return fail(e);
  }
}

export async function removePayment(paymentId: string) {
  const { supabase } = await requireManagement();
  await supabase.rpc("delete_payment", { p_id: paymentId });
  refresh();
}

/* =================== Messages =================== */

export async function sendMessage(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase, user } = await requireManagement();
    const to = str(fd, "to"); // "student:<id>" | "staff:<user_id>" | "all_lecturers"
    const subject = str(fd, "subject");
    const body = str(fd, "body");
    if (!to) return { error: "Choose who the message is for." };
    if (!subject) return { error: "Add a subject." };
    if (!body) return { error: "Write the message." };
    if (body.length > 4000) return { error: "Message is too long. Keep it under 4,000 characters." };

    let row: Record<string, string> = { sender_id: user.id, subject, body };
    let label = "all lecturers";
    if (to === "all_lecturers") {
      row = { ...row, audience: "all_lecturers" };
    } else if (to.startsWith("student:")) {
      row = { ...row, audience: "student", student_id: to.slice(8) };
      label = "the student";
    } else if (to.startsWith("staff:")) {
      row = { ...row, audience: "staff", staff_id: to.slice(6) };
      label = "the staff member";
    } else {
      return { error: "Choose who the message is for." };
    }
    const { error } = await supabase.from("messages").insert(row);
    if (error) return { error: error.message };
    refresh();
    return { ok: `Sent to ${label}. They'll see it next time they sign in.` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMessage(id: string) {
  const { supabase } = await requireManagement();
  await supabase.from("messages").delete().eq("id", id);
  refresh();
}

/* =================== Payroll (management) =================== */

const PAY_TO_METHODS = ["Bank", "Mobile money", "Cash"] as const;
const friendlyPayErr = (msg: string) =>
  /payslips_check|check constraint/.test(msg) ? "Deductions can't be more than basic pay plus allowances." : msg;

export async function saveStaffPay(userId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const basic_salary = money(str(fd, "basic_salary") || "0");
    const pay_method = str(fd, "pay_method");
    if (Number.isNaN(basic_salary) || basic_salary < 0) return { error: "Basic salary must be a number." };
    if (!PAY_TO_METHODS.includes(pay_method as never)) return { error: "Choose how they are paid." };
    const { error } = await supabase.from("staff_pay").upsert({
      user_id: userId, basic_salary, pay_method, pay_to: str(fd, "pay_to") || null, phone: str(fd, "phone") || null, updated_at: new Date().toISOString(),
    });
    if (error) return { error: error.message };
    refresh();
    return { ok: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function startPayroll(_: FormState, fd: FormData): Promise<FormState> {
  let runId = "";
  try {
    const { supabase } = await requireManagement();
    const month = str(fd, "month"); // "2026-10"
    if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Choose the month." };
    const { data, error } = await supabase.rpc("start_payroll", { p_period: `${month}-01` });
    if (error) return { error: error.message };
    runId = data as string;
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/admin/payroll/${runId}`);
}

export async function savePayslip(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const basic = money(str(fd, "basic") || "0");
    const allowances = money(str(fd, "allowances") || "0");
    const deductions = money(str(fd, "deductions") || "0");
    const method = str(fd, "method");
    if ([basic, allowances, deductions].some((n) => Number.isNaN(n) || n < 0)) return { error: "Amounts must be numbers of 0 or more." };
    if (!PAY_TO_METHODS.includes(method as never)) return { error: "Choose how they are paid." };
    const { error } = await supabase.from("payslips").update({ basic, allowances, deductions, method, note: str(fd, "note") || null }).eq("id", id);
    if (error) return { error: friendlyPayErr(error.message) };
    refresh();
    return { ok: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function markPayslipPaid(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const date = str(fd, "paid_on");
    const { error } = await supabase.from("payslips").update({
      status: "paid",
      reference: str(fd, "reference") || null,
      paid_at: date ? `${date}T12:00:00+02:00` : null,
    }).eq("id", id);
    if (error) return { error: friendlyPayErr(error.message) };
    await salaryText(supabase, id);
    refresh();
    return { ok: "Marked as paid. They can see it under My pay now." };
  } catch (e) {
    return fail(e);
  }
}

export async function markPayslipUnpaid(id: string) {
  const { supabase } = await requireManagement();
  await supabase.from("payslips").update({ status: "pending", reference: null }).eq("id", id);
  refresh();
}

export async function markAllPaid(runId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const date = str(fd, "paid_on");
    const { data, error } = await supabase
      .from("payslips")
      .update({ status: "paid", paid_at: date ? `${date}T12:00:00+02:00` : null })
      .eq("run_id", runId)
      .eq("status", "pending")
      .gt("net_pay", 0)
      .select("id");
    if (error) return { error: friendlyPayErr(error.message) };
    for (const p of data ?? []) await salaryText(supabase, p.id);
    refresh();
    return { ok: `${data?.length ?? 0} payslip${data?.length === 1 ? "" : "s"} marked as paid.` };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePayrollRun(runId: string) {
  const { supabase } = await requireManagement();
  const { count } = await supabase.from("payslips").select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "paid");
  if ((count ?? 0) > 0) return; // never delete a run with paid payslips
  await supabase.from("payroll_runs").delete().eq("id", runId);
  refresh();
  redirect("/admin/payroll");
}

/* =================== SMS (management) =================== */


type Sb = Awaited<ReturnType<typeof createClient>>;

async function logSms(sb: Sb, row: Record<string, unknown>) {
  await sb.from("sms_log").insert(row);
}

/** (a) Balance reminder for one owing student. At most one per student per 24 hours. */
async function remindStudent(sb: Sb, studentId: string): Promise<{ ok: boolean; msg: string }> {
  const { data: s } = await sb.from("students").select("id,full_name,student_no,status,student_accounts(fees_balance,phone)").eq("id", studentId).maybeSingle();
  if (!s) return { ok: false, msg: "Student not found." };
  const acc = s.student_accounts as unknown as { fees_balance: number; phone: string | null } | null;
  const bal = Number(acc?.fees_balance ?? 0);
  if (bal <= 0) return { ok: false, msg: `${s.full_name} doesn't owe anything.` };
  const to = normalizePhone(acc?.phone);
  if (!to) return { ok: false, msg: `${s.full_name} has no valid phone number. Add one under Details.` };
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await sb.from("sms_log").select("id", { count: "exact", head: true })
    .eq("student_id", studentId).eq("kind", "balance_reminder").eq("status", "sent").gte("created_at", since);
  if ((count ?? 0) > 0) return { ok: false, msg: `${s.full_name} was already reminded in the last 24 hours.` };
  const message = templates.balanceReminder(s.full_name, bal);
  const r = await sendSms(to, message);
  await logSms(sb, { kind: "balance_reminder", student_id: studentId, to_phone: to, message, status: r.ok ? "sent" : "failed", detail: r.detail, cost: r.cost ?? null });
  return { ok: r.ok, msg: r.ok ? `Reminder sent to ${s.full_name} (${to}).` : `Not sent: ${r.detail}` };
}

export async function sendBalanceReminder(studentId: string, _: FormState): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const { data: st } = await supabase.from("app_settings").select("sms_enabled").maybeSingle();
    if (!st?.sms_enabled) return { error: "SMS is switched off. Turn it on in Admin > Settings." };
    const r = await remindStudent(supabase, studentId);
    refresh();
    return r.ok ? { ok: r.msg } : { error: r.msg };
  } catch (e) {
    return fail(e);
  }
}

export async function remindAllOwing(_: FormState): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const { data: st } = await supabase.from("app_settings").select("sms_enabled").maybeSingle();
    if (!st?.sms_enabled) return { error: "SMS is switched off. Turn it on in Admin > Settings." };
    const { data: owing } = await supabase.from("student_accounts").select("student_id,fees_balance,students!inner(status)").gt("fees_balance", 0).in("students.status", ["Registered", "Pending"]);
    let sent = 0, skipped = 0;
    for (const o of (owing ?? []).slice(0, 300)) {
      const r = await remindStudent(supabase, o.student_id);
      if (r.ok) sent++; else skipped++;
    }
    refresh();
    return { ok: `${sent} reminder${sent === 1 ? "" : "s"} sent${skipped ? `, ${skipped} skipped (no phone, already reminded today, or failed). See the SMS log.` : "."}` };
  } catch (e) {
    return fail(e);
  }
}

/** (b) Salary paid text. Called after a payslip is marked paid. Once per payslip. */
async function salaryText(sb: Sb, payslipId: string) {
  const { data: st } = await sb.from("app_settings").select("sms_enabled").maybeSingle();
  if (!st?.sms_enabled) return;
  const { data: p } = await sb.from("payslips").select("id,staff_id,period,net_pay,method,status").eq("id", payslipId).maybeSingle();
  if (!p || p.status !== "paid" || Number(p.net_pay) <= 0) return;
  const { count } = await sb.from("sms_log").select("id", { count: "exact", head: true }).eq("payslip_id", payslipId).eq("kind", "salary_paid").eq("status", "sent");
  if ((count ?? 0) > 0) return;
  const [{ data: person }, { data: pay }] = await Promise.all([
    sb.from("staff").select("full_name").eq("user_id", p.staff_id).maybeSingle(),
    sb.from("staff_pay").select("phone").eq("user_id", p.staff_id).maybeSingle(),
  ]);
  const to = normalizePhone(pay?.phone);
  if (!to || !person) return;
  const message = templates.salaryPaid(person.full_name, Number(p.net_pay), monthLabel(p.period), p.method ?? "Bank");
  const r = await sendSms(to, message);
  await logSms(sb, { kind: "salary_paid", staff_id: p.staff_id, payslip_id: p.id, period: p.period, to_phone: to, message, status: r.ok ? "sent" : "failed", detail: r.detail, cost: r.cost ?? null });
}

export async function sendTestSms(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const to = normalizePhone(str(fd, "phone"));
    if (!to) return { error: "Enter a valid Zambian mobile number, e.g. 0977 123 456." };
    const message = "Manchilui Training Institute: test message from the admin portal. SMS is working.";
    const r = await sendSms(to, message);
    await logSms(supabase, { kind: "test", to_phone: to, message, status: r.ok ? "sent" : "failed", detail: r.detail, cost: r.cost ?? null });
    refresh();
    return r.ok ? { ok: `Test SMS sent to ${to}.` } : { error: `Not sent: ${r.detail}` };
  } catch (e) {
    return fail(e);
  }
}

/* =================== Settings (management) =================== */

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const reminder_day = Number(str(fd, "reminder_day"));
    const rates = ["napsa_rate", "nhima_rate", "paye_rate"].map((r) => Number(str(fd, r) || "0"));
    if (!(reminder_day >= 1 && reminder_day <= 28)) return { error: "Reminder day must be between 1 and 28." };
    if (rates.some((r) => !(r >= 0 && r <= 100))) return { error: "Rates must be between 0 and 100%." };
    const { error } = await supabase.from("app_settings").update({
      sms_enabled: fd.get("sms_enabled") === "on",
      reminder_day,
      napsa_rate: rates[0], nhima_rate: rates[1], paye_rate: rates[2],
      results_statement_enabled: fd.get("results_statement_enabled") === "on",
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    if (error) return { error: error.message };
    refresh();
    return { ok: "Settings saved. New rates apply to payslips that haven't been paid yet." };
  } catch (e) {
    return fail(e);
  }
}

export async function addCalendarPeriod(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireManagement();
    const label = str(fd, "label");
    const starts_on = str(fd, "starts_on");
    const ends_on = str(fd, "ends_on");
    if (label.length < 2) return { error: "Give the period a name, e.g. July – December 2026 session." };
    if (!starts_on || !ends_on) return { error: "Choose the start and end dates." };
    if (ends_on < starts_on) return { error: "The end date is before the start date." };
    const { error } = await supabase.from("fee_calendar").insert({ label, starts_on, ends_on });
    if (error) return { error: error.message };
    refresh();
    return { ok: "Added to the fee calendar." };
  } catch (e) {
    return fail(e);
  }
}

export async function removeCalendarPeriod(id: string) {
  const { supabase } = await requireManagement();
  await supabase.from("fee_calendar").delete().eq("id", id);
  refresh();
}

/* =================== Applications (management) =================== */

export async function acceptApplication(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase, user } = await requireManagement();
    const fees = money(str(fd, "fees_offered"));
    const start_date = str(fd, "start_date");
    if (!(fees >= 0)) return { error: "Enter the total fees, for example 6000." };
    if (!start_date) return { error: "Choose the start date." };
    const { error } = await supabase.from("applications").update({
      status: "Accepted", fees_offered: fees, start_date, decision_note: str(fd, "decision_note") || null,
      reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return { error: error.message };
    refresh();
    return { ok: "Accepted. Print the acceptance letter and call the applicant." };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectApplication(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase, user } = await requireManagement();
    const { error } = await supabase.from("applications").update({
      status: "Rejected", decision_note: str(fd, "decision_note") || null, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return { error: error.message };
    refresh();
    return { ok: "Marked as not accepted." };
  } catch (e) {
    return fail(e);
  }
}

export async function reopenApplication(id: string) {
  const { supabase } = await requireManagement();
  await supabase.from("applications").update({ status: "Applied" }).eq("id", id).neq("status", "Registered");
  refresh();
}

/** Turns an accepted applicant into a student with a portal login. */
export async function registerApplicant(id: string, _: FormState, fd: FormData): Promise<FormState> {
  let newId = "";
  try {
    const { supabase } = await requireManagement();
    const { data: app } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
    if (!app) return { error: "Application not found." };
    if (app.status !== "Accepted") return { error: "Accept the application before registering." };
    const student_no = str(fd, "student_no").toUpperCase();
    const session = str(fd, "session");
    const password = String(fd.get("password") ?? "");
    if (!STUDENT_ID_RE.test(student_no)) return { error: `Student ID must be ${STUDENT_ID_HINT}.` };
    if (!session) return { error: "Enter the session, for example January – June 2027." };
    if (password && password.length < 8) return { error: "Password must be at least 8 characters, or leave it blank to use the student ID." };
    const auth = adminAuth();

    const { data: row, error } = await supabase.from("students").insert({ student_no, full_name: app.full_name, session }).select("id").single();
    if (error) return { error: error.code === "23505" ? `${student_no} is already taken. Use the next number.` : error.message };
    const { error: accErr } = await supabase.from("student_accounts").upsert({ student_id: row.id, fees_balance: Number(app.fees_offered ?? 0), phone: app.phone });
    if (accErr) {
      await supabase.from("students").delete().eq("id", row.id);
      return { error: accErr.message };
    }
    const { error: authErr } = await createStudentLogin(auth, student_no, password);
    if (authErr) {
      await supabase.from("students").delete().eq("id", row.id);
      return { error: `The login couldn't be created: ${authErr.message}` };
    }
    await supabase.from("applications").update({ status: "Registered", student_id: row.id }).eq("id", id);
    newId = row.id;
  } catch (e) {
    return fail(e);
  }
  refresh();
  redirect(`/admin/students/${newId}?created=1`);
}

/* =================== Bulk student import (management) =================== */

export type ImportRow = { student_no: string; full_name: string; session: string; phone?: string; fees_balance?: string };
export type ImportResult = { student_no: string; ok: boolean; msg: string };

/** Imports up to 25 students per call. Each gets a login with their ID as the first password. */
export async function importStudents(rows: ImportRow[]): Promise<ImportResult[]> {
  const { supabase } = await requireManagement();
  const auth = adminAuth();
  const out: ImportResult[] = [];
  for (const r of rows.slice(0, 25)) {
    const student_no = (r.student_no ?? "").trim().toUpperCase();
    const full_name = (r.full_name ?? "").trim().replace(/\s+/g, " ");
    const session = (r.session ?? "").trim();
    const fees = money(String(r.fees_balance ?? "").trim() || "0");
    if (!STUDENT_ID_RE.test(student_no)) { out.push({ student_no: student_no || "(blank)", ok: false, msg: `ID must be ${STUDENT_ID_HINT}` }); continue; }
    if (full_name.length < 2) { out.push({ student_no, ok: false, msg: "Name missing" }); continue; }
    if (!session) { out.push({ student_no, ok: false, msg: "Session missing" }); continue; }
    if (Number.isNaN(fees)) { out.push({ student_no, ok: false, msg: "Fees balance isn't a number" }); continue; }

    const { data: row, error } = await supabase.from("students").insert({ student_no, full_name, session }).select("id").single();
    if (error) { out.push({ student_no, ok: false, msg: error.code === "23505" ? "Already exists (skipped)" : error.message }); continue; }
    const { error: accErr } = await supabase.from("student_accounts").upsert({ student_id: row.id, fees_balance: fees, phone: (r.phone ?? "").trim() || null });
    if (accErr) { await supabase.from("students").delete().eq("id", row.id); out.push({ student_no, ok: false, msg: accErr.message }); continue; }
    const { error: authErr } = await createStudentLogin(auth, student_no, "");
    if (authErr) {
      // A login may already exist from an earlier attempt; keep the record and link happens by trigger only on new logins.
      const msg = /already/i.test(authErr.message)
        ? "Record added, but an old login with this ID exists. Delete it in Supabase > Authentication, then use Reset password on their page."
        : `Record added, login not created: ${authErr.message}. Use Reset password on their page.`;
      out.push({ student_no, ok: false, msg });
      continue;
    }
    out.push({ student_no, ok: true, msg: "Added" });
  }
  refresh();
  return out;
}
