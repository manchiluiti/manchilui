import { NextResponse } from "next/server";
import { getStaff } from "@/lib/admin";
import { fetchDriveFile } from "@/lib/drive";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Doc = { path: string; name: string; kind: string; drive_id?: string; mime?: string };

/** Open an applicant's document. Management only. Drive copies stay private and are streamed through here. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const staff = await getStaff();
  if (!staff?.isManagement) return new NextResponse("Not allowed", { status: 403 });
  const { id, n } = await params;
  const { data: a } = await staff.supabase.from("applications").select("documents").eq("id", id).maybeSingle();
  const doc = ((a?.documents ?? []) as Doc[])[Number(n)];
  if (!doc) return new NextResponse("Not found", { status: 404 });
  if (doc.drive_id) {
    const r = await fetchDriveFile(doc.drive_id);
    const ext = doc.path.split(".").pop() ?? "pdf";
    return new NextResponse(r.body, {
      headers: {
        "Content-Type": r.headers.get("content-type") ?? doc.mime ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${(doc.kind || "document").replace(/[^\w-]/g, "")}.${ext}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  const { data } = await staff.supabase.storage.from("applications").createSignedUrl(doc.path, 600);
  if (!data?.signedUrl) return new NextResponse("File missing.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
