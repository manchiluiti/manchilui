import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { driveDownloadUrl } from "@/lib/drive";

export const dynamic = "force-dynamic";

/** Open a lecture note. Row level security decides who may see it (students and staff). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: n } = await sb.from("notes").select("file_path,drive_id").eq("id", id).maybeSingle();
  if (!n) return new NextResponse("Not found or not allowed. Sign in first.", { status: 404 });
  if (n.drive_id) return NextResponse.redirect(driveDownloadUrl(n.drive_id));
  const { data } = await sb.storage.from("notes").createSignedUrl(n.file_path, 600);
  if (!data?.signedUrl) return new NextResponse("File missing.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
