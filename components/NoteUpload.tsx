"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addNote } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";

const MAX = 25 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png";

export default function NoteUpload({ code }: { code: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const file = fd.get("file") as File | null;
    if (title.length < 2) return setMsg({ error: "Give the note a title, for example Week 2: Bills of lading." });
    if (!file || file.size === 0) return setMsg({ error: "Choose a file to upload." });
    if (file.size > MAX) return setMsg({ error: "That file is over 25 MB. Compress it or split it into parts." });

    setBusy(true);
    setMsg(null);
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `${code}/${Date.now()}-${safe}`;
    const { error } = await createClient().storage.from("notes").upload(path, file, { contentType: file.type || undefined });
    if (error) {
      setBusy(false);
      return setMsg({ error: `Upload failed: ${error.message}` });
    }
    const res = await addNote(code, { title, path, name: file.name, size: file.size });
    setBusy(false);
    setMsg(res);
    if (res?.ok) {
      form.current?.reset();
      router.refresh();
    }
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="aform" noValidate>
      <div className="field"><label htmlFor="n-title">Title</label><input id="n-title" name="title" placeholder="Week 2: Bills of lading" /></div>
      <div className="field"><label htmlFor="n-file">File (PDF, Word, PowerPoint, Excel or image, up to 25 MB)</label><input id="n-file" name="file" type="file" accept={ACCEPT} /></div>
      {msg?.error && <div className="err" role="alert">{msg.error}</div>}
      {msg?.ok && <div className="ok-msg" role="status">{msg.ok}</div>}
      <div><button className="btn btn-orange btn-sm" type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload note"}</button></div>
    </form>
  );
}
