import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getStaff } from "@/lib/admin";
import { DRIVE_SCOPES, driveConfigured, redirectUri } from "@/lib/drive";

export const dynamic = "force-dynamic";

/** Management only: send the browser to Google to approve Drive access. */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff?.isManagement) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!driveConfigured()) return NextResponse.redirect(new URL("/admin/settings?drive=missing-keys", req.url));
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: DRIVE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("g_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/google", maxAge: 600 });
  return res;
}
