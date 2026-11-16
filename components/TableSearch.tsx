"use client";
import { useEffect, useRef, useState } from "react";

/** Instant search box for long tables: hides rows whose data-search text doesn't match. Unsaved edits are kept. */
export default function TableSearch({ target, placeholder = "Search name or student ID…" }: { target: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const rows = document.querySelectorAll<HTMLTableRowElement>(`#${target} tbody tr[data-search]`);
    const term = q.trim().toLowerCase();
    let n = 0;
    rows.forEach((r) => {
      const hit = !term || (r.dataset.search ?? "").includes(term);
      r.style.display = hit ? "" : "none";
      if (hit) n++;
    });
    setShown(term ? n : null);
  }, [q, target]);
  return (
    <div className="tsearch">
      <input
        ref={ref}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        placeholder={placeholder}
        aria-label="Search students"
        autoComplete="off"
      />
      {shown !== null && <small>{shown} match{shown === 1 ? "" : "es"}{shown === 0 ? "" : " · your ticks on hidden rows are kept"}</small>}
    </div>
  );
}
