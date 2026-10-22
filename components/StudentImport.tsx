"use client";
import Link from "next/link";
import { useState } from "react";
import { importStudents, type ImportResult, type ImportRow } from "@/app/admin/actions";
import { STUDENT_ID_HINT, STUDENT_ID_RE } from "@/lib/site";

const COLS = ["student_no", "full_name", "session", "phone", "fees_balance"] as const;
const ALIASES: Record<string, (typeof COLS)[number]> = {
  "student id": "student_no", "student no": "student_no", "student_no": "student_no", id: "student_no", "student number": "student_no",
  name: "full_name", "full name": "full_name", "full_name": "full_name", "student name": "full_name",
  session: "session", intake: "session",
  phone: "phone", "phone number": "phone", mobile: "phone",
  "fees balance": "fees_balance", "fees_balance": "fees_balance", balance: "fees_balance", fees: "fees_balance",
};

/** Small CSV parser: handles quotes, commas and semicolons inside quotes, and Excel's BOM. */
function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const delim = (t.split("\n")[0].match(/;/g)?.length ?? 0) > (t.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

type Parsed = ImportRow & { problem?: string };

export default function StudentImport() {
  const [rows, setRows] = useState<Parsed[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(""); setResults(null); setRows([]);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setError("Please choose a .csv file. In Excel: File > Save As > CSV (Comma delimited).");
    const grid = parseCsv(await f.text());
    if (grid.length < 2) return setError("The file has no student rows.");
    const head = grid[0].map((h) => ALIASES[h.trim().toLowerCase()]);
    if (!head.includes("student_no") || !head.includes("full_name") || !head.includes("session")) {
      return setError("The first row must have the column names: Student ID, Full name, Session (Phone and Fees balance are optional).");
    }
    const seen = new Set<string>();
    const parsed: Parsed[] = grid.slice(1).map((r) => {
      const o: Record<string, string> = {};
      head.forEach((k, i) => { if (k) o[k] = (r[i] ?? "").trim(); });
      const p: Parsed = { student_no: (o.student_no ?? "").toUpperCase(), full_name: o.full_name ?? "", session: o.session ?? "", phone: o.phone, fees_balance: o.fees_balance };
      if (!STUDENT_ID_RE.test(p.student_no)) p.problem = `ID must be ${STUDENT_ID_HINT}`;
      else if (seen.has(p.student_no)) p.problem = "Duplicate ID in file";
      else if (p.full_name.length < 2) p.problem = "Name missing";
      else if (!p.session) p.problem = "Session missing";
      else if (p.fees_balance && Number.isNaN(Number(p.fees_balance.replace(/[,\sK]/gi, "")))) p.problem = "Fees balance isn't a number";
      seen.add(p.student_no);
      return p;
    });
    if (parsed.length > 500) return setError("That's more than 500 rows. Split the file into smaller parts.");
    setRows(parsed);
  }

  async function run() {
    const good = rows.filter((r) => !r.problem);
    setBusy(true); setProgress(0); setResults([]);
    const all: ImportResult[] = [];
    for (let i = 0; i < good.length; i += 20) {
      try {
        const res = await importStudents(good.slice(i, i + 20));
        all.push(...res);
      } catch {
        good.slice(i, i + 20).forEach((r) => all.push({ student_no: r.student_no, ok: false, msg: "Connection problem, try this one again" }));
      }
      setProgress(Math.min(good.length, i + 20));
      setResults([...all]);
    }
    setBusy(false);
  }

  const good = rows.filter((r) => !r.problem).length;
  const bad = rows.length - good;
  const added = (results ?? []).filter((r) => r.ok).length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section className="rec">
        <div className="rec-h"><h2>1. Choose the file</h2></div>
        <div className="rec-b" style={{ paddingBlock: 20, display: "grid", gap: 12 }}>
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} aria-label="CSV file" />
          <p className="hint">Columns: <b>Student ID</b>, <b>Full name</b>, <b>Session</b>, and optionally <b>Phone</b> and <b>Fees balance</b>. In Excel use File &gt; Save As &gt; CSV. Each student signs in with their ID as username and password, then must choose their own password.</p>
          {error && <div className="err" role="alert">{error}</div>}
        </div>
      </section>

      {rows.length > 0 && (
        <section className="rec">
          <div className="rec-h">
            <h2>2. Check and import</h2>
            <span className="hint" style={{ margin: 0 }}>{good} ready{bad ? ` · ${bad} with problems (won't be imported)` : ""}</span>
          </div>
          <div className="rec-b" style={{ paddingBlock: 12 }}>
            <div className="tablewrap flat" style={{ maxHeight: 420, overflowY: "auto" }}>
              <table className="table">
                <thead><tr><th>Student ID</th><th>Name</th><th>Session</th><th>Phone</th><th className="num">Balance</th><th>Check</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const res = results?.find((x) => x.student_no === r.student_no);
                    return (
                      <tr key={i}>
                        <td className="idlink">{r.student_no || "–"}</td><td>{r.full_name}</td><td>{r.session}</td><td>{r.phone || "–"}</td>
                        <td className="num">{r.fees_balance || "0"}</td>
                        <td>{r.problem ? <span className="pill warn">{r.problem}</span> : res ? <span className={`pill ${res.ok ? "ok" : "warn"}`}>{res.msg}</span> : <span className="pill wait">Ready</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
              <button className="btn btn-orange btn-sm" onClick={run} disabled={busy || good === 0 || !!(results && results.length && !busy)}>
                {busy ? `Importing… ${progress} of ${good}` : `Import ${good} student${good === 1 ? "" : "s"}`}
              </button>
              {results && !busy && results.length > 0 && <span className="ok-msg" style={{ padding: "8px 14px" }}>{added} added. <Link href="/admin/students" className="copy">Go to students →</Link></span>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
