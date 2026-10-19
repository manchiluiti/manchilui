"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function StaffLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!email || !password) return setError("Enter your email and password.");
    setBusy(true);
    const { error: err } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) return setError(err.message === "Invalid login credentials" ? "That email and password don't match." : err.message);
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="login">
      <div className="wrap">
        <form className="lcard" onSubmit={onSubmit} noValidate>
          <div style={{ display: "flex", justifyContent: "center" }}><Logo size={84} /></div>
          <h1>Staff Sign In</h1>
          <div className="sub">Manchilui admin panel</div>
          <div className="field"><label htmlFor="s-email">Email</label><input id="s-email" name="email" type="email" autoComplete="username" /></div>
          <div className="field"><label htmlFor="s-pw">Password</label><input id="s-pw" name="password" type="password" autoComplete="current-password" /></div>
          {error && <div className="err" role="alert">{error}</div>}
          <button className="btn btn-navy" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <div style={{ textAlign: "center" }}><Link className="back" href="/">← Back to website</Link></div>
      </div>
    </div>
  );
}
