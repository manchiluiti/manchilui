"use client";
import { useState } from "react";

const num = (s: string) => Number(s.replace(/[,\sK]/gi, ""));
const fmt = (n: number) => String(Math.round(n * 100) / 100);

/** "Amount paid" and "Balance" that always add up to the tuition fee. */
export default function LinkedFeeInputs({ fee, paid, balance }: { fee: number; paid: number; balance: number }) {
  const [p, setP] = useState(fmt(paid));
  const [b, setB] = useState(fmt(balance));
  const over = !Number.isNaN(num(p)) && num(p) > fee;
  return (
    <>
      <div className="fgrid">
        <div className="field">
          <label htmlFor="f-paid">Amount paid so far (K)</label>
          <input id="f-paid" name="paid_so_far" inputMode="decimal" value={p}
            onChange={(e) => { setP(e.target.value); const n = num(e.target.value); if (!Number.isNaN(n)) setB(fmt(Math.max(0, fee - n))); }} />
        </div>
        <div className="field">
          <label htmlFor="f-bal">Balance (K)</label>
          <input id="f-bal" name="balance" inputMode="decimal" value={b}
            onChange={(e) => { setB(e.target.value); const n = num(e.target.value); if (!Number.isNaN(n)) setP(fmt(Math.max(0, fee - n))); }} />
        </div>
      </div>
      <p className="hint">Tuition is K{fee.toLocaleString("en-ZM")}. Type either box and the other fills in.{over ? " Paid is more than the tuition fee, so the balance shows 0." : ""}</p>
    </>
  );
}
