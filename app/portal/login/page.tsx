"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { SITE, studentIdToEmail } from "@/lib/site";

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
      setError("That student ID and password don't match. Check both, or ask the office to reset your password.");
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
          <div className="field"><label htmlFor="l-id">Student ID</label><input id="l-id" name="student_id" placeholder="MTI-2026-XXX" autoComplete="username" autoCapitalize="characters" /></div>
          <div className="field"><label htmlFor="l-pw">Password</label><input id="l-pw" name="password" type="password" autoComplete="current-password" /></div>
          {error && <div className="err" role="alert">{error}</div>}
          <button className="btn btn-orange" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <p style={{ fontSize: ".85rem", color: "var(--muted)", textAlign: "center" }}>
            Forgot your password? Call the office on {SITE.directorPhone}.
          </p>
        </form>
        <div style={{ textAlign: "center" }}><Link className="back" href="/">← Back to website</Link></div>
      </div>
    </div>
  );
}
