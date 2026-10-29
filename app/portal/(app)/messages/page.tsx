import { requirePortalStudent, when } from "@/lib/portal";

export const metadata = { title: "Messages" };

export default async function PortalMessages() {
  const { supabase, user, student } = await requirePortalStudent();
  const { data: msgs } = await supabase.from("messages").select("id,subject,body,created_at,sender_name,category,module_code").eq("audience", "student").eq("student_id", student.id).order("created_at", { ascending: false }).limit(50);
  const ids = (msgs ?? []).map((m) => m.id);
  const { data: reads } = ids.length
    ? await supabase.from("message_reads").select("message_id").eq("user_id", user.id).in("message_id", ids)
    : { data: [] as { message_id: string }[] };
  const readSet = new Set((reads ?? []).map((r) => r.message_id));
  const unread = ids.filter((id) => !readSet.has(id));
  // Opening this page counts as reading; new ones stay highlighted this time.
  if (unread.length) {
    await supabase.from("message_reads").upsert(unread.map((message_id) => ({ message_id, user_id: user.id })), { onConflict: "message_id,user_id", ignoreDuplicates: true });
  }
  return (
    <div className="rec">
      <div className="rec-h"><h2>Messages</h2>{unread.length > 0 && <span className="pill warn">{unread.length} new</span>}</div>
      <div className="rec-b">
        {(msgs ?? []).length === 0 && <p className="muted-row">No messages from the office or your lecturers.</p>}
        {(msgs ?? []).map((m) => (
          <div className={`msgcard ${readSet.has(m.id) ? "" : "unread"}`} key={m.id}>
            <b>{m.category === "performance" && <span className="tag">Lecturer comment</span>}{m.subject}</b>
            <small>From {m.sender_name ?? "the office"}{m.module_code ? ` · ${m.module_code}` : ""} · {when(m.created_at)}</small>
            <p className="abody">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
