"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EnquiryForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const full_name = String(f.get("full_name") ?? "").trim();
    const phone = String(f.get("phone") ?? "").trim();
    if (!full_name || !phone) {
      setError("Add your name and phone number so admissions can reach you.");
      return;
    }
    if (!/^\+?[\d\s-]{9,15}$/.test(phone)) {
      setError("Enter a valid phone number, for example 0977 123 456.");
      return;
    }
    setError("");
    setStatus("sending");
    const { error: dbError } = await createClient().from("enquiries").insert({
      full_name,
      phone,
      preferred_intake: String(f.get("preferred_intake") ?? ""),
      message: String(f.get("message") ?? "").trim() || null,
    });
    if (dbError) {
      setStatus("idle");
      setError("Your enquiry didn't go through. Check your connection and try again, or call the office.");
      return;
    }
    setFirstName(full_name.split(" ")[0]);
    setStatus("sent");
    e.currentTarget.reset();
  }

  return (
    <form className="panel" style={{ alignSelf: "start" }} onSubmit={onSubmit} noValidate>
      <div>
        <p className="eyebrow" style={{ fontSize: ".75rem" }}>Application enquiry</p>
        <h2 style={{ marginTop: 8 }}>Ask About the Next Intake</h2>
      </div>
      <div className="field"><label htmlFor="e-name">Full name</label><input id="e-name" name="full_name" autoComplete="name" /></div>
      <div className="field"><label htmlFor="e-phone">Phone number</label><input id="e-phone" name="phone" inputMode="tel" placeholder="+260" /></div>
      <div className="field">
        <label htmlFor="e-intake">Preferred intake</label>
        <select id="e-intake" name="preferred_intake">
          <option>January 2027</option><option>July 2027</option><option>Not sure yet</option>
        </select>
      </div>
      <div className="field"><label htmlFor="e-msg">Question (optional)</label><textarea id="e-msg" name="message" /></div>
      {error && <div className="err" role="alert">{error}</div>}
      <button className="btn btn-orange" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send enquiry"}
      </button>
      {status === "sent" && (
        <div className="ok-msg" role="status">Thank you, {firstName}. Admissions has your enquiry and will call you.</div>
      )}
    </form>
  );
}
