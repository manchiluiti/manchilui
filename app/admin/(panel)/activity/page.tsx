import Link from "next/link";
import { kwacha, managementPage } from "@/lib/admin";

type Entry = { id: number; at: string; actor: string | null; table_name: string; action: string; subject: Record<string, string>; changes: Record<string, unknown> };

const AREAS: Record<string, { label: string; tables: string[] }> = {
  money: { label: "Fees & payments", tables: ["payments", "student_accounts"] },
  marks: { label: "Marks", tables: ["student_modules", "grade_scale"] },
  payroll: { label: "Payroll", tables: ["payslips", "staff_pay"] },
  people: { label: "Students & staff", tables: ["students", "staff", "applications"] },
  settings: { label: "Settings", tables: ["app_settings"] },
};
const LABEL: Record<string, string> = {
  fees_balance: "balance", amount: "amount", ca_mark: "CA", exam_mark: "exam", status: "status", basic: "basic", allowances: "allowances",
  deductions: "deductions", basic_salary: "basic salary", is_management: "management role", is_lecturer: "lecturer role", full_name: "name",
  min_mark: "minimum", phone: "phone", remark: "remark", method: "method", reference: "reference", paid_on: "date", session: "session",
};
const MONEY = new Set(["fees_balance", "amount", "basic", "allowances", "deductions", "basic_salary", "net_pay", "fees_offered"]);
const fmt = (k: string, v: unknown) => (v === null || v === undefined ? "empty" : MONEY.has(k) ? kwacha(Number(v)) : typeof v === "boolean" ? (v ? "yes" : "no") : String(v));
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });

function describe(e: Entry): string {
  const c = e.changes as Record<string, unknown>;
  if (e.table_name === "payments") {
    if (e.action === "INSERT") return `Recorded payment of ${fmt("amount", c.amount)} (${c.method})`;
    if (e.action === "DELETE") return `Removed payment of ${fmt("amount", c.amount)}`;
  }
  if (e.table_name === "payslips" && e.action === "INSERT") return `Payslip created (${fmt("basic", c.basic)} basic)`;
  if (e.table_name === "students" && e.action === "INSERT") return `Added student ${c.student_no}`;
  if (e.table_name === "staff" && e.action === "INSERT") return `Added staff member ${c.full_name}`;
  if (e.table_name === "applications" && e.action === "INSERT") return `New online application`;
  if (e.action === "DELETE") return `Deleted ${e.table_name.replace(/_/g, " ")}`;
  if (e.action === "UPDATE") {
    return Object.entries(c)
      .filter(([k]) => k !== "net_pay")
      .map(([k, v]) => {
        const [a, b] = v as [unknown, unknown];
        return `${LABEL[k] ?? k.replace(/_/g, " ")} ${fmt(k, a)} → ${fmt(k, b)}`;
      })
      .join(", ");
  }
  return `${e.action.toLowerCase()} ${e.table_name}`;
}

export default async function Activity({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area = "" } = await searchParams;
  const { supabase } = await managementPage();
  let q = supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(200);
  if (AREAS[area]) q = q.in("table_name", AREAS[area].tables);
  const [{ data }, { data: staff }, { data: students }] = await Promise.all([
    q,
    supabase.from("staff").select("user_id,full_name"),
    supabase.from("students").select("id,full_name,student_no"),
  ]);
  const who = (id: string | null) => (id ? (staff ?? []).find((s) => s.user_id === id)?.full_name ?? "A user" : "System / applicant");
  const about = (sub: Record<string, string>) => {
    if (sub.student_id) { const s = (students ?? []).find((x) => x.id === sub.student_id); return s ? `${s.full_name} (${s.student_no})${sub.module_code ? ` · ${sub.module_code}` : ""}` : "a student"; }
    if (sub.staff_id) return (staff ?? []).find((x) => x.user_id === sub.staff_id)?.full_name ?? "a staff member";
    if (sub.letter) return `Grade ${sub.letter}`;
    return "";
  };

  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Activity</p><h1>Who changed what</h1></div></div>
      <div className="stages">
        <Link href="/admin/activity" className={!area ? "on" : ""}>All</Link>
        {Object.entries(AREAS).map(([k, v]) => <Link key={k} href={`/admin/activity?area=${k}`} className={area === k ? "on" : ""}>{v.label}</Link>)}
      </div>
      <div className="rec">
        <div className="rec-b">
          {(data ?? []).length === 0 && <p className="muted-row">No activity recorded yet. Changes from now on appear here.</p>}
          {((data ?? []) as Entry[]).map((e) => (
            <div className="row" key={e.id} style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <b>{describe(e)}</b>
                <small>{about(e.subject)}{about(e.subject) ? " · " : ""}by {who(e.actor)} · {when(e.at)}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>Showing the latest 200 entries. This log can&apos;t be edited or deleted, by anyone.</p>
    </>
  );
}
