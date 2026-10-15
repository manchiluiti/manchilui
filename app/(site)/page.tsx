import Link from "next/link";
import Announcements, { type Announcement } from "@/components/Announcements";
import { SecHead } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id,title,body,posted_on")
    .eq("audience", "public")
    .order("posted_on", { ascending: false })
    .limit(3);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <div className="kicker">Diploma intake · Eastern Province</div>
            <h1>Learn to move goods across <em>borders</em>, by the book.</h1>
            <p className="lede">
              A six-month Diploma in Clearing and Forwarding, taught in Chipata, close to the Mwami border crossing.
              Practical training in customs procedure, shipping documents and cargo handling.
            </p>
            <div className="ctas">
              <Link className="btn btn-gold" href="/admissions">How to apply</Link>
              <Link className="btn btn-line" href="/programme">About the programme</Link>
            </div>
          </div>
          <div className="manifest" role="img" aria-label="Programme summary styled as a shipping document">
            <div className="mf-top"><b>PROGRAMME MANIFEST</b><span className="mono" style={{ fontSize: ".66rem" }}>Ref MTI/DCF</span></div>
            <div className="mf-row"><span>Award</span><span>Diploma in Clearing &amp; Forwarding</span></div>
            <div className="mf-row"><span>Duration</span><span>6 months</span></div>
            <div className="mf-row"><span>Origin</span><span>Eastrise, Chipata</span></div>
            <div className="mf-row"><span>Destination</span><span>Border posts, ports, freight agencies</span></div>
            <div className="mf-row"><span>Fees</span><span>Issued with acceptance letter</span></div>
            <div className="mf-foot"><span className="mono" style={{ fontSize: ".66rem" }}>Consignee: you</span><span className="stamp">ENROLLING</span></div>
          </div>
        </div>
      </section>

      <section className="facts">
        <div className="wrap">
          <div className="fact"><div className="k">Programme</div><div className="v">Diploma</div></div>
          <div className="fact"><div className="k">Length</div><div className="v">6 months</div></div>
          <div className="fact"><div className="k">Modules</div><div className="v">7 core</div></div>
          <div className="fact"><div className="k">Location</div><div className="v">Chipata</div></div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <SecHead>Start here</SecHead>
          <div className="grid3">
            <Link className="qcard" href="/programme"><h3>The Programme</h3><p>What you study, how classes run and where graduates work.</p><span className="go">Read more →</span></Link>
            <Link className="qcard" href="/admissions"><h3>Admissions</h3><p>Entry requirements, documents to bring and the application steps.</p><span className="go">Apply →</span></Link>
            <Link className="qcard" href="/portal"><h3>Student Portal</h3><p>Current students: check registration, fees balance and module results.</p><span className="go">Sign in →</span></Link>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap grid2">
          <div>
            <SecHead>Announcements</SecHead>
            <Announcements items={(data ?? []) as Announcement[]} empty="No announcements right now. Check back soon." />
          </div>
          <div>
            <SecHead>Why Manchilui</SecHead>
            <div className="prose">
              <p>Clearing agents keep trade moving. Every truck at a border and every container at a port needs someone who knows the paperwork, the tariff and the procedure.</p>
              <p>Manchilui trains that person. Classes are small, lecturers come from the trade, and the course is built around the documents and procedures you will handle on your first day of work.</p>
              <Link className="btn btn-navy" href="/about" style={{ justifySelf: "start" }}>About the institute</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <h2>Ready to start a career in trade?</h2>
          <Link className="btn btn-navy" href="/admissions">See how to apply</Link>
        </div>
      </section>
    </>
  );
}
