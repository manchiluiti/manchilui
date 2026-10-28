"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX = 5 * 1024 * 1024;
const OK_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOCS = [
  { key: "results", label: "Grade 12 results or certificate", required: true },
  { key: "nrc", label: "NRC (both sides)", required: true },
  { key: "photo", label: "Passport-size photo", required: false },
];

export default function ApplicationForm() {
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (String(fd.get("website") ?? "")) return; // bot trap
    if (Date.now() - started.current < 4000) return setError("Please take a moment to check your details, then submit again.");

    const full_name = String(fd.get("full_name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    if (full_name.length < 2) return setError("Enter your full name.");
    if (!/^\+?[\d\s-]{9,15}$/.test(phone)) return setError("Enter a valid phone number, for example 0977 123 456.");
    const grade12 = String(fd.get("grade12_year") ?? "").trim();
    if (grade12 && !/^(19|20)\d{2}$/.test(grade12)) return setError("Enter the year you wrote Grade 12, for example 2023.");

    const files: { key: string; file: File }[] = [];
    for (const d of DOCS) {
      const f = fd.get(d.key) as File | null;
      if (f && f.size > 0) {
        if (f.size > MAX) return setError(`${d.label} is over 5 MB. Take a smaller photo or scan.`);
        if (!OK_TYPES.includes(f.type)) return setError(`${d.label} must be a PDF, JPG or PNG.`);
        files.push({ key: d.key, file: f });
      } else if (d.required) {
        return setError(`Please attach your ${d.label}.`);
      }
    }

    setBusy(true);
    setError("");
    const sb = createClient();
    const id = crypto.randomUUID();
    const documents: { path: string; name: string; kind: string }[] = [];
    for (const { key, file } of files) {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const path = `${id}/${key}.${ext}`;
      const { error: upErr } = await sb.storage.from("applications").upload(path, file, { contentType: file.type });
      if (upErr) {
        setBusy(false);
        return setError(`Couldn't upload your ${key === "nrc" ? "NRC" : key}. Check your connection and try again.`);
      }
      documents.push({ path, name: file.name, kind: key });
    }

    const { error: insErr } = await sb.from("applications").insert({
      id,
      full_name,
      phone,
      email: String(fd.get("email") ?? "").trim() || null,
      date_of_birth: String(fd.get("date_of_birth") ?? "") || null,
      town: String(fd.get("town") ?? "").trim() || null,
      preferred_intake: String(fd.get("preferred_intake") ?? ""),
      grade12_year: grade12 ? Number(grade12) : null,
      message: String(fd.get("message") ?? "").trim() || null,
      documents,
    });
    setBusy(false);
    if (insErr) return setError("Your application didn't go through. Check your connection and try again, or call the office.");
    setDone(full_name.split(" ")[0]);
    form.current?.reset();
  }

  if (done) {
    return (
      <div className="panel" style={{ alignSelf: "start" }}>
        <p className="eyebrow" style={{ fontSize: ".75rem" }}>Application received</p>
        <h2>Thank you, {done}.</h2>
        <p>We&apos;ve received your application and documents. The admissions office will review them and call you on the number you gave. Successful applicants receive an acceptance letter with the fees and start date.</p>
      </div>
    );
  }

  return (
    <form ref={form} className="panel" style={{ alignSelf: "start" }} onSubmit={onSubmit} noValidate>
      <div>
        <p className="eyebrow" style={{ fontSize: ".75rem" }}>Apply online</p>
        <h2 style={{ marginTop: 8 }}>Application Form</h2>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <div className="fgrid">
        <div className="field full"><label htmlFor="a-name">Full name (as on NRC)</label><input id="a-name" name="full_name" autoComplete="name" /></div>
        <div className="field"><label htmlFor="a-phone">Phone number</label><input id="a-phone" name="phone" inputMode="tel" placeholder="0977 123 456" /></div>
        <div className="field"><label htmlFor="a-email">Email (optional)</label><input id="a-email" name="email" type="email" /></div>
        <div className="field"><label htmlFor="a-dob">Date of birth</label><input id="a-dob" name="date_of_birth" type="date" /></div>
        <div className="field"><label htmlFor="a-town">Town</label><input id="a-town" name="town" placeholder="Chipata" /></div>
        <div className="field"><label htmlFor="a-g12">Year you wrote Grade 12</label><input id="a-g12" name="grade12_year" inputMode="numeric" placeholder="2024" /></div>
        <div className="field"><label htmlFor="a-intake">Preferred intake</label>
          <select id="a-intake" name="preferred_intake"><option>January 2027</option><option>July 2027</option><option>Not sure yet</option></select>
        </div>
      </div>
      <div className="docs">
        {DOCS.map((d) => (
          <div className="field" key={d.key}>
            <label htmlFor={`a-${d.key}`}>{d.label}{d.required ? "" : " (optional)"}</label>
            <input id={`a-${d.key}`} name={d.key} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" capture={undefined} />
          </div>
        ))}
        <p className="hint">PDF, JPG or PNG, up to 5 MB each. A clear phone photo is fine.</p>
      </div>
      <div className="field"><label htmlFor="a-msg">Anything else we should know? (optional)</label><textarea id="a-msg" name="message" /></div>
      {error && <div className="err" role="alert">{error}</div>}
      <button className="btn btn-orange" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</button>
    </form>
  );
}
