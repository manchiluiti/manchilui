import "server-only";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** The signed-in staff member, or null if the visitor isn't staff. */
export async function getStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("staff").select("full_name").eq("user_id", user.id).maybeSingle();
  return data ? { user, name: data.full_name as string, supabase } : null;
}

export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) throw new Error("Your session has ended or you are not staff. Sign in again.");
  return staff;
}

/** Service-role client: only used server-side, after requireStaff(), to manage login accounts. */
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

export const STATUSES = ["Registered", "Pending", "Suspended", "Completed", "Withdrawn"] as const;
export const MODULE_STATUSES = ["Not started", "In progress", "Completed"] as const;
export const PAY_METHODS = ["Cash", "Mobile money", "Bank"] as const;
