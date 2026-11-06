import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** App start page: staff go to the admin panel, everyone else to the student portal (which asks them to sign in). */
export async function GET(req: Request) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: staff } = await sb.from("staff").select("is_management,is_lecturer").eq("user_id", user.id).maybeSingle();
    if (staff && (staff.is_management || staff.is_lecturer)) return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.redirect(new URL("/portal", req.url));
}
