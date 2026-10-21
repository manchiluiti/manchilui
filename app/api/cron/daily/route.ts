import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { monthLabel, normalizePhone, sendSms, templates } from "@/lib/sms";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs once a day (Vercel Cron, see vercel.json). It:
 *  1. keeps the free Supabase project from pausing (any query counts as activity), and
 *  2. on the reminder day, inside a fee-calendar period, texts every owing student once that month.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 500 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });

  const { data: settings } = await sb.from("app_settings").select("sms_enabled,reminder_day").maybeSingle();

  const now = new Date(Date.now() + 2 * 3600e3); // Zambia time
  const today = now.toISOString().slice(0, 10);
  const period = `${today.slice(0, 7)}-01`;
  const result: Record<string, unknown> = { date: today, awake: true };

  if (!settings?.sms_enabled) return NextResponse.json({ ...result, reminders: "sms off" });
  if (now.getUTCDate() !== settings.reminder_day) return NextResponse.json({ ...result, reminders: `not reminder day (${settings.reminder_day})` });

  const { data: cal } = await sb.from("fee_calendar").select("id").lte("starts_on", today).gte("ends_on", today).limit(1);
  if (!cal?.length) return NextResponse.json({ ...result, reminders: "outside fee calendar" });

  const { data: owing } = await sb
    .from("student_accounts")
    .select("student_id,fees_balance,phone,students!inner(full_name,status)")
    .gt("fees_balance", 0)
    .in("students.status", ["Registered", "Pending"]);
  const { data: done } = await sb.from("sms_log").select("student_id").eq("kind", "monthly_reminder").eq("period", period).eq("status", "sent");
  const already = new Set((done ?? []).map((d) => d.student_id));

  let sent = 0, failed = 0, skipped = 0;
  for (const o of (owing ?? []).slice(0, 300)) {
    if (already.has(o.student_id)) { skipped++; continue; }
    const to = normalizePhone(o.phone);
    if (!to) { skipped++; continue; }
    const st = o.students as unknown as { full_name: string };
    const message = templates.monthlyReminder(st.full_name, Number(o.fees_balance), monthLabel(period));
    const r = await sendSms(to, message);
    await sb.from("sms_log").insert({
      kind: "monthly_reminder", student_id: o.student_id, period, to_phone: to, message,
      status: r.ok ? "sent" : "failed", detail: r.detail, cost: r.cost ?? null, sent_by: null,
    });
    if (r.ok) sent++; else failed++;
  }
  return NextResponse.json({ ...result, reminders: { sent, failed, skipped } });
}
