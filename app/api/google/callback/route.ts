import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/admin";
import { ensureRoot, exchangeCode } from "@/lib/drive";
import { serviceClient } from "@/lib/service";

export const dynamic = "force-dynamic";

const back = (req: NextRequest, q: string) => {
  const res = NextResponse.redirect(new URL(`/admin/settings?drive=${q}`, req.url));
  res.cookies.delete({ name: "g_state", path: "/api/google" });
  return res;
};

export async function GET(req: NextRequest) {
  const staff = await getStaff();
  if (!staff?.isManagement) return NextResponse.redirect(new URL("/admin/login", req.url));
  const p = req.nextUrl.searchParams;
  if (p.get("error")) return back(req, "cancelled");
  if (!p.get("state") || p.get("state") !== req.cookies.get("g_state")?.value) return back(req, "expired");
  try {
    const tok = await exchangeCode(p.get("code") ?? "");
    if (!tok.refresh_token) return back(req, "no-refresh");
    let email: string | null = null;
    try {
      const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
      email = (await u.json()).email ?? null;
    } catch { /* optional */ }
    const { error } = await serviceClient().from("drive_account").upsert({
      id: 1, email, refresh_token: tok.refresh_token, root_id: null, students_id: null, notes_id: null, connected_by: staff.user.id, connected_at: new Date().toISOString(),
    });
    if (error) return back(req, "save-failed");
    await ensureRoot();
    return back(req, "connected");
  } catch {
    return back(req, "failed");
  }
}
