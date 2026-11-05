import "server-only";
import { serviceClient } from "@/lib/service";

/**
 * Google Drive storage for the institute's own Google account.
 * Scope drive.file: the system can only see and change files it created itself.
 *
 * Layout in Drive:
 *   Manchilui Portal/
 *     Students/<student no> – <name>/  (application documents, private)
 *     Notes/<module code>/             (lecture notes, readable by anyone with the link)
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
export const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.file openid email";

export const driveConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const redirectUri = () => process.env.GOOGLE_REDIRECT_URI ?? "https://manchilui.com/api/google/callback";

type Account = { email: string | null; refresh_token: string; root_id: string | null; students_id: string | null; notes_id: string | null };

let cached: { token: string; expires: number; refresh: string } | null = null;

export async function getAccount(): Promise<Account | null> {
  const { data } = await serviceClient().from("drive_account").select("email,refresh_token,root_id,students_id,notes_id").eq("id", 1).maybeSingle();
  return (data as Account) ?? null;
}

async function accessToken(acc: Account) {
  if (cached && cached.refresh === acc.refresh_token && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: acc.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google Drive sign-in failed (${j.error ?? res.status}). Reconnect Google Drive in Settings.`);
  cached = { token: j.access_token, expires: Date.now() + Number(j.expires_in ?? 3600) * 1000, refresh: acc.refresh_token };
  return cached.token;
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error_description ?? j.error ?? "Google sign-in failed.");
  return j as { access_token: string; refresh_token?: string; id_token?: string };
}

async function api(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Google Drive: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function findOrCreateFolder(token: string, name: string, parent?: string | null) {
  const q = [`name = '${name.replace(/'/g, "\\'")}'`, "mimeType = 'application/vnd.google-apps.folder'", "trashed = false", parent ? `'${parent}' in parents` : "'root' in parents"].join(" and ");
  const found = await (await api(token, `/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`)).json();
  if (found.files?.[0]?.id) return found.files[0].id as string;
  const made = await (await api(token, "/files?fields=id", { method: "POST", body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: parent ? [parent] : undefined }) })).json();
  return made.id as string;
}

/** Root, Students and Notes folders (created on first use and remembered). */
export async function ensureRoot(acc?: Account | null) {
  acc = acc ?? (await getAccount());
  if (!acc) throw new Error("Google Drive isn't connected. Connect it in Settings.");
  const token = await accessToken(acc);
  if (acc.root_id && acc.students_id && acc.notes_id) return { token, acc, root: acc.root_id, students: acc.students_id, notes: acc.notes_id };
  const root = await findOrCreateFolder(token, "Manchilui Portal");
  const students = await findOrCreateFolder(token, "Students", root);
  const notes = await findOrCreateFolder(token, "Notes", root);
  await serviceClient().from("drive_account").update({ root_id: root, students_id: students, notes_id: notes }).eq("id", 1);
  return { token, acc: { ...acc, root_id: root, students_id: students, notes_id: notes }, root, students, notes };
}

/** Resumable upload, so large files (e.g. 25 MB slides) work. */
async function upload(token: string, bytes: ArrayBuffer, name: string, mime: string, parent: string) {
  const init = await api(token, `${UPLOAD}?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": mime, "X-Upload-Content-Length": String(bytes.byteLength) },
    body: JSON.stringify({ name, parents: [parent] }),
  });
  const session = init.headers.get("location");
  if (!session) throw new Error("Google Drive didn't start the upload.");
  const res = await fetch(session, { method: "PUT", headers: { "Content-Type": mime }, body: bytes });
  if (!res.ok) throw new Error(`Google Drive upload failed: ${res.status}`);
  return (await res.json()).id as string;
}

async function fromSupabase(bucket: string, path: string) {
  const { data, error } = await serviceClient().storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Couldn't read ${path}: ${error?.message ?? "missing"}`);
  return { bytes: await data.arrayBuffer(), mime: data.type || "application/octet-stream" };
}

export const driveDownloadUrl = (id: string) => `https://drive.usercontent.google.com/download?id=${id}&export=download`;

/** Move one lecture note from Supabase to Drive/Notes/<module>. Readable by anyone who has the link (students reach it through the portal). */
export async function moveNoteToDrive(noteId: string) {
  const sb = serviceClient();
  const { data: n } = await sb.from("notes").select("id,module_code,file_path,file_name,drive_id").eq("id", noteId).maybeSingle();
  if (!n || n.drive_id) return false;
  const { token, notes } = await ensureRoot();
  const folder = await findOrCreateFolder(token, n.module_code, notes);
  const { bytes, mime } = await fromSupabase("notes", n.file_path);
  const id = await upload(token, bytes, n.file_name, mime, folder);
  await api(token, `/files/${id}/permissions`, { method: "POST", body: JSON.stringify({ role: "reader", type: "anyone" }) });
  const { error } = await sb.from("notes").update({ drive_id: id, mime_type: mime }).eq("id", n.id);
  if (error) throw new Error(error.message);
  await sb.storage.from("notes").remove([n.file_path]);
  return true;
}

type Doc = { path: string; name: string; kind: string; drive_id?: string; mime?: string };

/** Move a registered student's application documents to Drive/Students/<ID – Name>. Private. */
export async function moveApplicationToDrive(appId: string) {
  const sb = serviceClient();
  const { data: a } = await sb.from("applications").select("id,status,documents,student_id,files_moved_at,students(student_no,full_name,drive_folder_id)").eq("id", appId).maybeSingle();
  if (!a || a.status !== "Registered" || !a.student_id || a.files_moved_at) return false;
  const st = a.students as unknown as { student_no: string; full_name: string; drive_folder_id: string | null };
  const docs = (a.documents ?? []) as Doc[];
  const { token, students } = await ensureRoot();
  const folder = st.drive_folder_id ?? (await findOrCreateFolder(token, `${st.student_no} – ${st.full_name}`, students));
  if (!st.drive_folder_id) await sb.from("students").update({ drive_folder_id: folder }).eq("id", a.student_id);
  const out: Doc[] = [];
  for (const d of docs) {
    if (d.drive_id) { out.push(d); continue; }
    const { bytes, mime } = await fromSupabase("applications", d.path);
    const ext = d.path.split(".").pop() ?? "pdf";
    const id = await upload(token, bytes, `${d.kind || "document"}.${ext}`, mime, folder);
    out.push({ ...d, drive_id: id, mime });
  }
  const { error } = await sb.from("applications").update({ documents: out, files_moved_at: new Date().toISOString() }).eq("id", a.id);
  if (error) throw new Error(error.message);
  const paths = docs.filter((d) => !d.drive_id).map((d) => d.path);
  if (paths.length) await sb.storage.from("applications").remove(paths);
  return true;
}

/** Stream a private Drive file through the server (application documents are at most 5 MB). */
export async function fetchDriveFile(id: string) {
  const { token } = await ensureRoot();
  return api(token, `/files/${id}?alt=media`);
}

export async function deleteDriveFile(id: string) {
  const acc = await getAccount();
  if (!acc) return;
  try {
    const token = await accessToken(acc);
    await fetch(`${API}/files/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  } catch {
    /* best effort */
  }
}

/** Move everything still waiting in Supabase. Stops early to stay within the time limit. */
export async function moveAllPending(budgetMs = 45_000) {
  const start = Date.now();
  const sb = serviceClient();
  if (!(await getAccount())) return { notes: 0, students: 0, left: 0, error: "Google Drive isn't connected." };
  const [{ data: notes }, { data: apps }] = await Promise.all([
    sb.from("notes").select("id").is("drive_id", null).order("created_at").limit(200),
    sb.from("applications").select("id").eq("status", "Registered").is("files_moved_at", null).limit(200),
  ]);
  let n = 0, s = 0, failed = 0;
  let error: string | undefined;
  for (const x of notes ?? []) {
    if (Date.now() - start > budgetMs) break;
    try { if (await moveNoteToDrive(x.id)) n++; } catch (e) { failed++; error = (e as Error).message; }
  }
  for (const x of apps ?? []) {
    if (Date.now() - start > budgetMs) break;
    try { if (await moveApplicationToDrive(x.id)) s++; } catch (e) { failed++; error = (e as Error).message; }
  }
  const left = (notes?.length ?? 0) + (apps?.length ?? 0) - n - s;
  return { notes: n, students: s, left, failed, error };
}

/** Rejected applications: delete their uploaded documents after 60 days. */
export async function clearOldRejected() {
  const sb = serviceClient();
  const cutoff = new Date(Date.now() - 60 * 86400e3).toISOString();
  const { data } = await sb.from("applications").select("id,documents").eq("status", "Rejected").lt("reviewed_at", cutoff).neq("documents", "[]").limit(100);
  let cleared = 0;
  for (const a of data ?? []) {
    const paths = ((a.documents ?? []) as Doc[]).filter((d) => !d.drive_id).map((d) => d.path);
    if (paths.length) await sb.storage.from("applications").remove(paths);
    await sb.from("applications").update({ documents: [] }).eq("id", a.id);
    cleared++;
  }
  return cleared;
}
