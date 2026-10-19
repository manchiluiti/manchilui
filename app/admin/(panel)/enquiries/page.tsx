import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { setEnquiryHandled } from "../../actions";

export default async function EnquiriesAdmin({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const all = show === "all";
  const { supabase } = await requireStaff();
  let q = supabase.from("enquiries").select("*").order("created_at", { ascending: false });
  if (!all) q = q.eq("handled", false);
  const { data } = await q;

  const wa = (p: string) => p.replace(/[^0-9]/g, "").replace(/^0/, "260");

  return (
    <>
      <div className="ahead">
        <div><p className="eyebrow" style={{ fontSize: ".72rem" }}>Enquiries</p><h1>{all ? "All enquiries" : "Waiting for a call back"}</h1></div>
        <Link className="btn btn-navy btn-sm" href={all ? "/admin/enquiries" : "/admin/enquiries?show=all"}>{all ? "Show new only" : "Show all"}</Link>
      </div>
      <div className="cards">
        {(data ?? []).length === 0 && <div className="rec"><p className="muted-row" style={{ padding: 24 }}>{all ? "No enquiries yet." : "All caught up. No new enquiries."}</p></div>}
        {(data ?? []).map((e) => (
          <div className="rec enq" key={e.id}>
            <div className="rec-h">
              <div><h2>{e.full_name}</h2><small className="when">{new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lusaka" })}</small></div>
              <span className={`pill ${e.handled ? "wait" : "warn"}`}>{e.handled ? "Handled" : "New"}</span>
            </div>
            <div className="rec-b" style={{ paddingBlock: 16, display: "grid", gap: 10 }}>
              <div><span className="k">Phone</span> <b>{e.phone}</b></div>
              <div><span className="k">Intake</span> {e.preferred_intake || "Not given"}</div>
              {e.message && <p className="abody">{e.message}</p>}
              <div className="enq-actions">
                <a className="btn btn-sm wa" href={`https://wa.me/${wa(e.phone)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                <a className="btn btn-sm btn-navy" href={`tel:${e.phone.replace(/\s/g, "")}`}>Call</a>
                <form action={setEnquiryHandled.bind(null, e.id, !e.handled)}>
                  <button className="btn btn-sm btn-outline" type="submit">{e.handled ? "Mark as new" : "Mark handled"}</button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
