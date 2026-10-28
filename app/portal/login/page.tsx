"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { SITE, studentIdToEmail } from "@/lib/site";
import PasswordInput from "@/components/PasswordInput";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = String(f.get("student_id") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!id || !password) {
      setError("Enter your student ID and password to sign in.");
      return;
    }
    setBusy(true);
    const { error: authError } = await createClient().auth.signInWithPassword({
      email: studentIdToEmail(id),
      password,
    });
    setBusy(false);
    if (authError) {
      const code = (authError as { code?: string }).code ?? "";
      const msg =
        code === "email_provider_disabled" || /logins are disabled/i.test(authError.message)
          ? "Student sign-in is switched off. Ask the office to turn on email sign-in in Supabase."
          : code === "email_not_confirmed"
          ? "This account hasn't been confirmed yet. Ask the office to confirm it."
          : code === "invalid_credentials"
          ? "That student ID and password don't match. Check both, or ask the office to reset your password."
          : `Sign-in failed: ${authError.message}`;
      setError(msg);
      return;
    }
    router.replace("/portal");
    router.refresh();
  }

  return (
    <div className="login">
      <div className="wrap">
        <form className="lcard" onSubmit={onSubmit} noValidate>
          <div style={{ display: "flex", justifyContent: "center" }}><Logo size={84} /></div>
          <h1>Student Portal</h1>
          <div className="sub">{SITE.name}</div>
          <div className="field"><label htmlFor="l-id">Student ID</label><input id="l-id" name="student_id" placeholder="e.g. 20260647" inputMode="numeric" autoComplete="username" autoCapitalize="characters" /></div>
          <div className="field"><label htmlFor="l-pw">Password</label><PasswordInput id="l-pw" name="password" autoComplete="current-password" /></div>
          {error && <div className="err" role="alert">{error}</div>}
          <button className="btn btn-orange" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", textAlign: "center" }}>
            Forgot your password? Call the office on {SITE.phone}.
          </p>
        </form>
        <div style={{ textAlign: "center" }}><Link className="back" href="/">← Back to website</Link></div>
      </div>
    </div>
  );
}
