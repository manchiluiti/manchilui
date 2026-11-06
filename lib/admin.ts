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
  const { data } = await staff.supabase.from("module_lecturers").select("module_code").eq("module_code", code).eq("lecturer_id", staff.user.id).limit(1);
  if (!data?.length || !staff.isLecturer) throw new Error("You are not assigned to this module.");
  return staff;
}

/** Intakes that currently have students (archived intakes excluded), in the order they started. */
export async function currentIntakes(sb: Staff["supabase"]) {
  const { data } = await sb.from("students").select("session,created_at").is("archived_at", null).order("created_at");
  return [...new Set((data ?? []).map((s) => s.session as string).filter(Boolean))];
}

/** Intakes this staff member can work with in a module: all current ones for management or an "all intakes"
 *  assignment; otherwise the intakes they're assigned to. */
export async function moduleIntakes(staff: Staff, code: string) {
  const all = await currentIntakes(staff.supabase);
  if (staff.isManagement) return all;
  const { data } = await staff.supabase.from("module_lecturers").select("session").eq("module_code", code).eq("lecturer_id", staff.user.id);
  if ((data ?? []).some((r) => r.session === null)) return all;
  return (data ?? []).map((r) => r.session as string);
}

/** Server-side check that a lecturer may post to this module + intake. */
export async function requireIntakeAccess(code: string, session: string) {
  const staff = await requireModuleAccess(code);
  if (!session) throw new Error("Choose the intake.");
  if (staff.isManagement) return staff;
  const ok = (await moduleIntakes(staff, code)).includes(session);
  if (!ok) throw new Error(`You don't teach ${code} for ${session}.`);
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

export const DEFAULT_TUITION = 6000;

/** Standard tuition fee from Settings (K6000 until changed; works even before the 0010 migration runs). */
export async function tuitionFee(supabase: Staff["supabase"]) {
  const { data } = await supabase.from("app_settings").select("*").maybeSingle();
  const v = Number((data as { tuition_fee?: number } | null)?.tuition_fee);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_TUITION;
}
