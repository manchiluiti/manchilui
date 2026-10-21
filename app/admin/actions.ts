"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminAuth, MODULE_STATUSES, PAY_METHODS, requireManagement, requireModuleAccess, requireStaff, STATUSES,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_EMAIL_DOMAIN, studentIdToEmail } from "@/lib/site";

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

    if (!/^MTI-\d{4}-\d{3}$/.test(student_no)) return { error: "Student ID must look like MTI-2026-001." };
    if (full_name.length < 2) return { error: "Enter the student's full name." };
    if (!session) return { error: "Enter the session, for example January – June 2027." };
    if (Number.isNaN(fees_balance)) return { error: "Fees balance must be a number, for example 2500." };
    if (password.length < 6) return { error: "Password must be at least 6 characters." };

    const auth = adminAuth();

    const { data: row, error } = await supabase.from("students").insert({ student_no, full_name, session }).select("id").single();
    if (error) return { error: error.code === "23505" ? `${student_no} is already taken. Use the next number.` : error.message };

    // The account row is created by a trigger; fill in the private details.
    const { error: accErr } = await supabase.from("student_accounts").upsert({ student_id: row.id, fees_balance, phone });
    if (accErr) {
      await supabase.from("students").delete().eq("id", row.id);
      return { error: accErr.message };
    }

    const { error: authErr } = await auth.createUser({ email: studentIdToEmail(student_no), password, email_confirm: true });
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
    if (password.length < 6) return { error: "Password must be at least 6 characters." };
    const { data: s, error } = await supabase.from("students").select("student_no,user_id").eq("id", id).single();
    if (error) return { error: error.message };
    const auth = adminAuth();
    if (s.user_id) {
      const { error: e2 } = await auth.updateUserById(s.user_id, { password });
      if (e2) return { error: e2.message };
      return { ok: `Password changed. Give ${s.student_no} the new password.` };
    }
    const { error: e3 } = await auth.createUser({ email: studentIdToEmail(s.student_no), password, email_confirm: true });
    if (e3) return { error: e3.message };
    refresh();
    return { ok: `Login created for ${s.student_no}.` };
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
