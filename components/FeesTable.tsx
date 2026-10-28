"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { bulkSetFees, type FeeRow } from "@/app/admin/actions";

export type FeeStudent = { id: string; student_no: string; full_name: string; session: string; paid: number; balance: number };

const k = (n: number) => `K ${n.toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (s: string) => Number(s.replace(/[,\sK]/gi, ""));

export default function FeesTable({ students, fee }: { students: FeeStudent[]; fee: number }) {
  const [vals, setVals] = useState<Record<string, { paid: string; balance: string }>>(
    () => Object.fromEntries(students.map((s) => [s.id, { paid: String(s.paid), balance: String(s.balance) }])),
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const changed = useMemo(
    () => students.filter((s) => num(vals[s.id].paid) !== s.paid || num(vals[s.id].balance) !== s.balance),
    [students, vals],
  );
  const shown = students.filter((s) => !q || `${s.full_name} ${s.student_no}`.toLowerCase().includes(q.toLowerCase()));
  const totals = students.reduce(
    (t, s) => ({ paid: t.paid + (num(vals[s.id].paid) || 0), bal: t.bal + (num(vals[s.id].balance) || 0) }),
    { paid: 0, bal: 0 },
  );

  async function save() {
    const bad = changed.find((s) => Number.isNaN(num(vals[s.id].paid)) || Number.isNaN(num(vals[s.id].balance)));
    if (bad) return setMsg({ error: `${bad.full_name}: enter numbers only.` });
    setBusy(true); setMsg(null); setErrs({});
    const rows: FeeRow[] = changed.map((s) => ({ student_id: s.id, paid: vals[s.id].paid, balance: vals[s.id].balance }));
    const res = await bulkSetFees(rows);
    setBusy(false);
    setErrs(Object.fromEntries(res.errors.map((e) => [e.student_id, e.msg])));
    setMsg(res.errors.length ? { error: `${res.saved} saved, ${res.errors.length} not saved (see the red notes).` } : { ok: `${res.saved} student${res.saved === 1 ? "" : "s"} updated.` });
    if (!res.errors.length) location.reload();
  }

  return (
    <>
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID" aria-label="Search students" />
        <span className="hint" style={{ margin: 0 }}>Tuition K{fee.toLocaleString("en-ZM")}: type paid or balance and the other fills in · Total paid {k(totals.paid)} · Outstanding {k(totals.bal)}</span>
      </div>
      <div className="tablewrap">
        <table className="table feestable">
          <thead><tr><th>Student</th><th className="num">Paid so far (K)</th><th className="num">Balance (K)</th><th className="num">Total fees</th></tr></thead>
          <tbody>
            {shown.map((s) => {
              const v = vals[s.id];
              const dirty = num(v.paid) !== s.paid || num(v.balance) !== s.balance;
              const total = (num(v.paid) || 0) + (num(v.balance) || 0);
              return (
                <tr key={s.id} className={dirty ? "dirty" : ""}>
                  <td>
                    <Link href={`/admin/students/${s.id}`} className="idlink">{s.full_name}</Link>
                    <small className="sub">{s.student_no} · {s.session}</small>
                    {errs[s.id] && <small className="err" style={{ display: "block" }}>{errs[s.id]}</small>}
                  </td>
                  <td className="num"><input inputMode="decimal" value={v.paid} aria-label={`${s.full_name} paid so far`} onChange={(e) => { const n = num(e.target.value); setVals({ ...vals, [s.id]: { paid: e.target.value, balance: Number.isNaN(n) ? v.balance : String(Math.max(0, Math.round((fee - n) * 100) / 100)) } }); }} /></td>
                  <td className="num"><input inputMode="decimal" value={v.balance} aria-label={`${s.full_name} balance`} onChange={(e) => { const n = num(e.target.value); setVals({ ...vals, [s.id]: { balance: e.target.value, paid: Number.isNaN(n) ? v.paid : String(Math.max(0, Math.round((fee - n) * 100) / 100)) } }); }} /></td>
                  <td className="num">{Number.isNaN(total) ? "–" : k(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="savebar">
        {msg?.error && <span className="err">{msg.error}</span>}
        {msg?.ok && <span className="ok-msg" style={{ padding: "8px 14px" }}>{msg.ok}</span>}
        <button className="btn btn-orange btn-sm" onClick={save} disabled={busy || changed.length === 0}>
          {busy ? "Saving…" : changed.length ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "No changes"}
        </button>
      </div>
    </>
  );
}
