"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearPasswordFlag } from "@/app/portal/actions";
import { createClient } from "@/lib/supabase/client";

/** Lets the signed-in user set a new password. `forbidden` is a value the new password may not equal (e.g. the student ID). */
export default function ChangePassword({ forbidden, next, submit = "Save new password" }: { forbidden?: string; next: string; submit?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password") ?? "");
    const again = String(f.get("again") ?? "");
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (forbidden && pw.trim().toUpperCase() === forbidden.toUpperCase()) return setError("Your new password can't be your student ID. Choose something only you know.");
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError("Use a mix of letters and numbers.");
    if (pw !== again) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    const { error: err } = await createClient().auth.updateUser({ password: pw });
    if (err) {
      setBusy(false);
      return setError(/same/i.test(err.message) ? "That's your current password. Choose a new one." : err.message);
    }
    await clearPasswordFlag();
    setBusy(false);
    setDone(true);
    setTimeout(() => { router.replace(next); router.refresh(); }, 1200);
  }

  if (done) return <div className="ok-msg" role="status">Password changed. Taking you in…</div>;
  return (
    <form className="aform" onSubmit={onSubmit} noValidate>
      <div className="field"><label htmlFor="np">New password</label><input id="np" name="password" type="password" autoComplete="new-password" /></div>
      <div className="field"><label htmlFor="np2">Type it again</label><input id="np2" name="again" type="password" autoComplete="new-password" /></div>
      <p className="hint">At least 8 characters, with letters and numbers. Don&apos;t share it with anyone.</p>
      {error && <div className="err" role="alert">{error}</div>}
      <button className="btn btn-orange" type="submit" disabled={busy}>{busy ? "Saving…" : submit}</button>
    </form>
  );
}
