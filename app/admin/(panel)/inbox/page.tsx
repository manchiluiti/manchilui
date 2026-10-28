import { redirect } from "next/navigation";
import { getStaff } from "@/lib/admin";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lusaka" });

export const dynamic = "force-dynamic";

export default async function Inbox() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (!staff.isLecturer) redirect("/admin/messages");
  const sb = staff.supabase;
  const me = staff.user.id;

  const { data: msgs } = await sb
    .from("messages")
    .select("id,audience,subject,body,created_at,sender_id")
    .or(`and(audience.eq.staff,staff_id.eq.${me}),audience.eq.all_lecturers`)
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (msgs ?? []).map((m) => m.id);

  const [{ data: reads }, { data: people }, { data: notices }] = await Promise.all([
    ids.length ? sb.from("message_reads").select("message_id").eq("user_id", me).in("message_id", ids) : Promise.resolve({ data: [] as { message_id: string }[] }),
    sb.from("staff").select("user_id,full_name"),
    sb.from("announcements").select("id,title,body,posted_on,audience").in("audience", ["staff", "staff_students", "public"]).order("posted_on", { ascending: false }).limit(8),
  ]);
  const readSet = new Set((reads ?? []).map((r) => r.message_id));
  const unreadIds = ids.filter((id) => !readSet.has(id));

  // Opening the inbox marks everything shown as read; the highlight below reflects the state before this visit.
  if (unreadIds.length) {
    await sb.from("message_reads").upsert(unreadIds.map((message_id) => ({ message_id, user_id: me })), { onConflict: "message_id,user_id", ignoreDuplicates: true });
  }
  const from = (id: string | null) => (people ?? []).find((p) => p.user_id === id)?.full_name ?? "Administration";

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Inbox</p><h1>Messages and notices</h1></div>
        {unreadIds.length > 0 && <span className="pill warn">{unreadIds.length} new</span>}
      </div>
      {(notices ?? []).length > 0 && (
        <div className="rec" style={{ maxWidth: 820, marginBottom: 24 }}>
          <div className="rec-h"><h2>Notices</h2></div>
          <div className="rec-b">
            {(notices ?? []).map((n) => (
              <div className="msgcard" key={n.id}>
                <div className="msgtop"><b>{n.title}</b><span className="pill wait">{n.audience === "staff" ? "Staff" : n.audience === "staff_students" ? "Staff & students" : "Everyone"}</span></div>
                <small>{n.posted_on}</small>
                <p className="abody">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="rec" style={{ maxWidth: 820 }}>
        <div className="rec-b">
          {(msgs ?? []).length === 0 && <p className="muted-row">No messages yet.</p>}
          {(msgs ?? []).map((m) => (
            <div className={`msgcard ${readSet.has(m.id) ? "" : "unread"}`} key={m.id}>
              <div className="msgtop">
                <b>{m.subject}</b>
                <span className="pill wait">{m.audience === "all_lecturers" ? "All lecturers" : "To you"}</span>
              </div>
              <small>From {from(m.sender_id)} · {when(m.created_at)}</small>
              <p className="abody">{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
