import "server-only";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Staff = {
  user: { id: string; email?: string };
  name: string;
  isManagement: boolean;
  isLecturer: boolean;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/** The signed-in staff member with their roles, or null if the visitor isn't staff. */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("staff").select("full_name,is_management,is_lecturer").eq("user_id", user.id).maybeSingle();
  if (!data || (!data.is_management && !data.is_lecturer)) return null;
  return { user, name: data.full_name, isManagement: data.is_management, isLecturer: data.is_lecturer, supabase };
}

export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) throw new Error("Your session has ended or you are not staff. Sign in again.");
  return staff;
}

export async function requireManagement() {
  const staff = await requireStaff();
  if (!staff.isManagement) throw new Error("Only management can do this.");
  return staff;
}

/** Management can open any module; lecturers only the ones assigned to them. */
export async function requireModuleAccess(code: string) {
  const staff = await requireStaff();
  if (staff.isManagement) return staff;
  const { data } = await staff.supabase.from("module_lecturers").select("module_code").eq("module_code", code).eq("lecturer_id", staff.user.id).maybeSingle();
  if (!data || !staff.isLecturer) throw new Error("You are not assigned to this module.");
  return staff;
}

/** Modules this staff member works with: all for management, assigned ones for lecturers. */
export async function myModules(staff: Staff) {
  const { data: mods } = await staff.supabase.from("modules").select("code,name,sort").order("sort");
  if (staff.isManagement) return mods ?? [];
  const { data: mine } = await staff.supabase.from("module_lecturers").select("module_code").eq("lecturer_id", staff.user.id);
  const set = new Set((mine ?? []).map((m) => m.module_code));
  return (mods ?? []).filter((m) => set.has(m.code));
}

/** Service-role client: only used server-side, after a role check, to manage login accounts. */
export function adminAuth() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Creating logins needs SUPABASE_SERVICE_ROLE_KEY in Vercel's environment variables. Add it, then redeploy.");
  }
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.admin;
}

export const kwacha = (n: number | string) =>
  `K ${Number(n).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const mark = (n: number | string | null | undefined) => (n === null || n === undefined || n === "" ? "–" : `${Number(n)}%`);

export const STATUSES = ["Registered", "Pending", "Suspended", "Completed", "Withdrawn"] as const;
export const MODULE_STATUSES = ["Not started", "In progress", "Completed"] as const;
export const PAY_METHODS = ["Cash", "Mobile money", "Bank"] as const;

export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });

/** For management-only pages: lecturers are sent to their teaching area instead. */
export async function managementPage(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!staff.isManagement) redirect("/admin/teaching");
  return staff;
}
