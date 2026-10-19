"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminAuth, MODULE_STATUSES, PAY_METHODS, requireStaff, STATUSES } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { studentIdToEmail } from "@/lib/site";

export type FormState = { ok?: string; error?: string } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const money = (v: string) => {
  const n = Number(v.replace(/[,\sK]/gi, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};
const fail = (e: unknown): FormState => ({ error: e instanceof Error ? e.message : "Something went wrong. Try again." });

export async function staffSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* ---------- students ---------- */

export async function createStudent(_: FormState, fd: FormData): Promise<FormState> {
  let newId = "";
  try {
    const { supabase } = await requireStaff();
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

    const auth = adminAuth(); // fail early if the service key is missing

    const { data: row, error } = await supabase
      .from("students")
      .insert({ student_no, full_name, session, phone, fees_balance })
      .select("id")
      .single();
    if (error) {
      return { error: error.code === "23505" ? `${student_no} is already taken. Use the next number.` : error.message };
    }

    // Creating the login also links it to the student row (database trigger).
    const { error: authErr } = await auth.createUser({ email: studentIdToEmail(student_no), password, email_confirm: true });
    if (authErr) {
      await supabase.from("students").delete().eq("id", row.id);
      return { error: `The login couldn't be created: ${authErr.message}` };
    }
    newId = row.id;
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/students/${newId}?created=1`);
}

export async function updateStudent(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireStaff();
    const status = str(fd, "status");
    const fees_balance = money(str(fd, "fees_balance"));
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { error: "Choose a valid status." };
    if (Number.isNaN(fees_balance)) return { error: "Fees balance must be a number." };
    const { error } = await supabase.from("students").update({
      full_name: str(fd, "full_name"),
      phone: str(fd, "phone") || null,
      session: str(fd, "session"),
      status,
      fees_balance,
      remark: str(fd, "remark") || null,
    }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin", "layout");
    return { ok: "Details saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function recordPayment(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireStaff();
    const amount = money(str(fd, "amount"));
    const method = str(fd, "method");
    if (!(amount > 0)) return { error: "Enter an amount greater than zero." };
    if (!PAY_METHODS.includes(method as (typeof PAY_METHODS)[number])) return { error: "Choose how it was paid." };
    const { data, error } = await supabase.rpc("record_payment", {
      p_student: id,
      p_amount: amount,
      p_method: method,
      p_reference: str(fd, "reference"),
      p_paid_on: str(fd, "paid_on") || null,
    });
    if (error) return { error: error.message };
    revalidatePath("/admin", "layout");
    return { ok: `Payment recorded. New balance: K ${Number(data).toLocaleString("en-ZM", { minimumFractionDigits: 2 })}` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateModules(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireStaff();
    const codes = fd.getAll("code").map(String);
    for (const code of codes) {
      const status = str(fd, `status_${code}`);
      if (!MODULE_STATUSES.includes(status as (typeof MODULE_STATUSES)[number])) continue;
      const { error } = await supabase
        .from("student_modules")
        .update({ status, grade: str(fd, `grade_${code}`) || null })
        .eq("student_id", id)
        .eq("module_code", code);
      if (error) return { error: `${code}: ${error.message}` };
    }
    revalidatePath("/admin", "layout");
    return { ok: "Modules saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function setPassword(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireStaff();
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
    revalidatePath("/admin", "layout");
    return { ok: `Login created for ${s.student_no}.` };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- announcements ---------- */

export async function createAnnouncement(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await requireStaff();
    const title = str(fd, "title");
    const body = str(fd, "body");
    const audience = str(fd, "audience") === "students" ? "students" : "public";
    if (!title || !body) return { error: "Add a title and a message." };
    const { error } = await supabase.from("announcements").insert({ title, body, audience, posted_on: str(fd, "posted_on") || undefined });
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    return { ok: audience === "public" ? "Posted on the website and the portal." : "Posted in the Student Portal." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAnnouncement(id: string) {
  const { supabase } = await requireStaff();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/* ---------- enquiries ---------- */

export async function setEnquiryHandled(id: string, handled: boolean) {
  const { supabase } = await requireStaff();
  await supabase.from("enquiries").update({ handled }).eq("id", id);
  revalidatePath("/admin", "layout");
}
