import ActionForm from "@/components/ActionForm";
import { managementPage } from "@/lib/admin";
import { createAnnouncement, deleteAnnouncement } from "../../actions";

const AUD_LABEL: Record<string, string> = {
  public: "Everyone", website: "Website only", students: "Students only", staff: "Staff only", staff_students: "Staff and students", module: "Class:",
};

export default async function AnnouncementsAdmin() {
  const { supabase } = await managementPage();
  const { data } = await supabase.from("announcements").select("id,title,body,audience,posted_on,module_code").order("posted_on", { ascending: false }).order("created_at", { ascending: false });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="ahead"><div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Announcements</p><h1>Notice board</h1></div></div>
      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <section className="rec">
          <div className="rec-h"><h2>New announcement</h2></div>
          <div className="rec-b" style={{ paddingBlock: 20 }}>
            <ActionForm action={createAnnouncement} submit="Post announcement" resetOnSuccess>
              <div className="field"><label htmlFor="a-title">Title</label><input id="a-title" name="title" placeholder="January 2027 intake now open" /></div>
              <div className="field"><label htmlFor="a-body">Message</label><textarea id="a-body" name="body" /></div>
              <div className="fgrid">
                <div className="field"><label htmlFor="a-aud">Who sees it</label>
                  <select id="a-aud" name="audience" defaultValue="public">
                    <option value="public">Everyone (website, students and staff)</option>
                    <option value="website">Website only</option>
                    <option value="students">Students only (portal)</option>
                    <option value="staff">Staff only</option>
                    <option value="staff_students">Staff and students (not the website)</option>
                  </select>
                </div>
                <div className="field"><label htmlFor="a-date">Date</label><input id="a-date" name="posted_on" type="date" defaultValue={today} /></div>
              </div>
            </ActionForm>
          </div>
        </section>
        <section className="rec">
          <div className="rec-h"><h2>Posted</h2></div>
          <div className="rec-b">
            {(data ?? []).length === 0 && <p className="muted-row">Nothing posted yet.</p>}
            {(data ?? []).map((a) => (
              <div className="row" key={a.id} style={{ alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <b>{a.title}</b>
                  <small>{a.posted_on} · {AUD_LABEL[a.audience] ?? a.audience}{a.audience === "module" ? ` ${a.module_code}` : ""}</small>
                  <p className="abody">{a.body}</p>
                </div>
                <form action={deleteAnnouncement.bind(null, a.id)}><button className="del" type="submit">Delete</button></form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
