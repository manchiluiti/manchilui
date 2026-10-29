import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/admin";
import { gradeFor, type GradeBand } from "@/lib/grades";

type Mod = { module_code: string; ca_mark: number | null; exam_mark: number | null; final_mark: number | null };

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of one intake: details, fees and every module's marks. Management only. */
export async function GET(req: NextRequest) {
  const staff = await getStaff();
  if (!staff?.isManagement) return new NextResponse("Not allowed", { status: 403 });
  const session = req.nextUrl.searchParams.get("session") ?? "";
  const sb = staff.supabase;
  const [{ data: students }, { data: mods }, { data: scale }] = await Promise.all([
    sb.from("students").select("id,student_no,full_name,session,status,archived_at,student_accounts(fees_balance,paid_before,phone),payments(amount),student_modules(module_code,ca_mark,exam_mark,final_mark)").eq("session", session).order("student_no"),
    sb.from("modules").select("code").order("sort"),
    sb.from("grade_scale").select("letter,min_mark,remark,is_pass"),
  ]);
  const codes = (mods ?? []).map((m) => m.code);
  const head = ["Student ID", "Full name", "Intake", "Status", "Archived", "Phone", "Paid", "Balance", ...codes.flatMap((c) => [`${c} CA`, `${c} Exam`, `${c} Final`, `${c} Grade`])];
  const lines = [head.map(cell).join(",")];
  for (const s of students ?? []) {
    const acc = s.student_accounts as unknown as { fees_balance: number; paid_before: number; phone: string | null } | null;
    const paid = Number(acc?.paid_before ?? 0) + ((s.payments as unknown as { amount: number }[]) ?? []).reduce((t, p) => t + Number(p.amount), 0);
    const sm = (s.student_modules as unknown as Mod[]) ?? [];
    const marks = codes.flatMap((c) => {
      const m = sm.find((x) => x.module_code === c);
      return [m?.ca_mark, m?.exam_mark, m?.final_mark, gradeFor(m?.final_mark ?? null, (scale ?? []) as GradeBand[])?.letter ?? ""];
    });
    lines.push([s.student_no, s.full_name, s.session, s.status, s.archived_at ? s.archived_at.slice(0, 10) : "", acc?.phone ?? "", paid, Number(acc?.fees_balance ?? 0), ...marks].map(cell).join(","));
  }
  const file = `manchilui-${session.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase() || "intake"}.csv`;
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"` },
  });
}
