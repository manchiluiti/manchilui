import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PortalStudent = { id: string; student_no: string; full_name: string; programme: string; session: string; status: string };
export type ModuleRow = { module_code: string; status: string; ca_mark: number | null; exam_mark: number | null; final_mark: number | null; modules: { name: string; sort: number } };

/** Signed-in student and their own record (row level security limits every query to them). Shared by the portal layout and pages. */
export const getPortal = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");
  if (user.app_metadata?.must_change_password) redirect("/portal/password");
  const { data: student } = await supabase.from("students").select("id,student_no,full_name,programme,session,status").eq("user_id", user.id).maybeSingle<PortalStudent>();
  return { supabase, user, student };
});

export async function requirePortalStudent() {
  const p = await getPortal();
  if (!p.student) redirect("/portal");
  return p as typeof p & { student: PortalStudent };
}

export async function myModules(sb: Awaited<ReturnType<typeof getPortal>>["supabase"], studentId: string) {
  const { data } = await sb.from("student_modules").select("module_code,status,ca_mark,exam_mark,final_mark,modules(name,sort)").eq("student_id", studentId);
  return ((data ?? []) as unknown as ModuleRow[]).sort((a, b) => a.modules.sort - b.modules.sort);
}

/** Unread message ids for this student. */
export async function unreadMessages(sb: Awaited<ReturnType<typeof getPortal>>["supabase"], userId: string, studentId: string) {
  const { data: msgs } = await sb.from("messages").select("id").eq("audience", "student").eq("student_id", studentId).order("created_at", { ascending: false }).limit(50);
  const ids = (msgs ?? []).map((m) => m.id);
  if (!ids.length) return [] as string[];
  const { data: reads } = await sb.from("message_reads").select("message_id").eq("user_id", userId).in("message_id", ids);
  const read = new Set((reads ?? []).map((r) => r.message_id));
  return ids.filter((id) => !read.has(id));
}

export const kwacha = (n: number) => `K ${Number(n).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = (n: number | null) => (n === null ? "–" : `${Number(n)}%`);
export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });

export async function feeSummary(sb: Awaited<ReturnType<typeof getPortal>>["supabase"], studentId: string) {
  const [{ data: acc }, { data: pays }] = await Promise.all([
    sb.from("student_accounts").select("fees_balance,paid_before,remark").eq("student_id", studentId).maybeSingle(),
    sb.from("payments").select("id,amount,method,reference,paid_on").eq("student_id", studentId).order("paid_on", { ascending: false }),
  ]);
  const bal = Number(acc?.fees_balance ?? 0);
  const before = Number(acc?.paid_before ?? 0);
  const paid = before + (pays ?? []).reduce((t, p) => t + Number(p.amount), 0);
  return { bal, before, paid, owing: bal > 0, remark: acc?.remark as string | null | undefined, pays: pays ?? [] };
}
