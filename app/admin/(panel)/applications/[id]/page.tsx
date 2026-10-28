import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { kwacha, managementPage } from "@/lib/admin";
import { nextStudentId } from "@/lib/site";
import { acceptApplication, registerApplicant, rejectApplication, reopenApplication } from "../../../actions";
import PasswordInput from "@/components/PasswordInput";

type Doc = { path: string; name: string; kind: string };
const KIND: Record<string, string> = { results: "Grade 12 results", nrc: "NRC", photo: "Photo" };
const d = (s: string | null) => (s ? new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lusaka" }) : "–");

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await managementPage();
  const { data: a } = await supabase.from("applications").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const docs = (a.documents ?? []) as Doc[];
  const urls = new Map<string, string>();
  if (docs.length) {
    const { data: signed } = await supabase.storage.from("applications").createSignedUrls(docs.map((x) => x.path), 3600);
    (signed ?? []).forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  }
  const year = new Date().getFullYear();
  const { data: last } = await supabase.from("students").select("student_no").like("student_no", `${year}%`);
  const nextId = nextStudentId((last ?? []).map((d) => d.student_no), year);

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}><Link href={`/admin/applications?status=${a.status}`}>Applications</Link> / {a.status === "Applied" ? "New" : a.status}</p><h1>{a.full_name}</h1></div>
        {(a.status === "Accepted" || a.status === "Registered") && <Link className="btn btn-navy btn-sm" href={`/admin/applications/${id}/letter`}>Acceptance letter</Link>}
      </div>

      <div className="grid2" style={{ gap: 24, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 24 }}>
          <section className="rec">
            <div className="rec-h"><h2>Applicant</h2><span className="pill warn">{a.status === "Applied" ? "New" : a.status}</span></div>
            <div className="rec-b">
              <div className="kv"><span className="k">Phone</span><span className="v">{a.phone}</span></div>
              <div className="kv"><span className="k">Email</span><span className="v">{a.email ?? "–"}</span></div>
              <div className="kv"><span className="k">Date of birth</span><span className="v">{d(a.date_of_birth)}</span></div>
              <div className="kv"><span className="k">Town</span><span className="v">{a.town ?? "–"}</span></div>
              <div className="kv"><span className="k">Grade 12 year</span><span className="v">{a.grade12_year ?? "–"}</span></div>
              <div className="kv"><span className="k">Intake</span><span className="v">{a.preferred_intake ?? "–"}</span></div>
              <div className="kv"><span className="k">Applied</span><span className="v">{d(a.created_at)}</span></div>
              {a.message && <div className="kv"><span className="k">Note</span><span className="v">{a.message}</span></div>}
            </div>
          </section>
          <section className="rec">
            <div className="rec-h"><h2>Documents</h2></div>
            <div className="rec-b">
              {docs.length === 0 && <p className="muted-row">No documents attached.</p>}
              {docs.map((x) => (
                <div className="row" key={x.path}>
                  <div><b>{KIND[x.kind] ?? x.kind}</b><small>{x.name}</small></div>
                  {urls.get(x.path) && <a className="btn btn-sm btn-navy" href={urls.get(x.path)} target="_blank" rel="noreferrer">Open</a>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          {a.status === "Applied" && (
            <>
              <section className="rec">
                <div className="rec-h"><h2>Accept</h2></div>
                <div className="rec-b" style={{ paddingBlock: 20 }}>
                  <ActionForm action={acceptApplication.bind(null, id)} submit="Accept applicant">
                    <div className="fgrid">
                      <div className="field"><label htmlFor="fo">Total fees (K)</label><input id="fo" name="fees_offered" inputMode="decimal" /></div>
                      <div className="field"><label htmlFor="sd">Start date</label><input id="sd" name="start_date" type="date" /></div>
                    </div>
                    <div className="field"><label htmlFor="an">Note for the letter (optional)</label><input id="an" name="decision_note" placeholder="e.g. Report to the office by 8:00 on the first day" /></div>
                  </ActionForm>
                </div>
              </section>
              <section className="rec">
                <div className="rec-h"><h2>Don&apos;t accept</h2></div>
                <div className="rec-b" style={{ paddingBlock: 20 }}>
                  <ActionForm action={rejectApplication.bind(null, id)} submit="Mark as not accepted" variant="navy">
                    <div className="field"><label htmlFor="rn">Reason (internal)</label><input id="rn" name="decision_note" /></div>
                  </ActionForm>
                </div>
              </section>
            </>
          )}

          {a.status === "Accepted" && (
            <section className="rec">
              <div className="rec-h"><h2>Register as a student</h2></div>
              <div className="rec-b" style={{ paddingBlock: 20 }}>
                <p className="hint" style={{ marginBottom: 12 }}>Accepted with fees of {kwacha(a.fees_offered ?? 0)}, starting {d(a.start_date)}. Registering creates their student record (balance {kwacha(a.fees_offered ?? 0)}) and portal login.</p>
                <ActionForm action={registerApplicant.bind(null, id)} submit="Register student">
                  <div className="fgrid">
                    <div className="field"><label htmlFor="sn">Student ID</label><input id="sn" name="student_no" defaultValue={nextId} /></div>
                    <div className="field"><label htmlFor="ss">Session</label><input id="ss" name="session" placeholder="January – June 2027" /></div>
                    <div className="field"><label htmlFor="sp">Portal password (optional)</label><PasswordInput id="sp" name="password" autoComplete="new-password" placeholder="Blank = student ID" /></div>
                  </div>
                </ActionForm>
              </div>
            </section>
          )}

          {a.status === "Registered" && a.student_id && (
            <section className="rec"><div className="rec-b" style={{ paddingBlock: 20 }}>
              <p>Registered. <Link className="copy" href={`/admin/students/${a.student_id}`}>Open student record →</Link></p>
            </div></section>
          )}

          {(a.status === "Accepted" || a.status === "Rejected") && (
            <form action={reopenApplication.bind(null, id)}><button className="del" type="submit">Move back to New</button></form>
          )}
          {a.decision_note && <p className="hint">Note: {a.decision_note}</p>}
        </div>
      </div>
    </>
  );
}
