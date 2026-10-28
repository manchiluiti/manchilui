import Link from "next/link";
import Announcements, { type Announcement } from "@/components/Announcements";
import HeroVisual from "@/components/HeroVisual";
import { IconBook, IconBriefcase, IconClipboard, IconFile, IconTruck, IconUser, IconUsers } from "@/components/Icons";
import { SecHead } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

const START = [
  { href: "/programme", title: "The Programme", text: "What you study, how classes run and where graduates go on to work.", more: "Learn More", Icon: IconBook },
  { href: "/admissions", title: "Admissions", text: "Entry requirements, documents to bring and the steps to apply.", more: "Apply Now", Icon: IconClipboard },
  { href: "/portal", title: "Student Portal", text: "Current students: check registration, fees balance and module results.", more: "Sign In", Icon: IconUser },
];

const WHY = [
  { title: "Built around real documents", text: "Bills of lading, commercial invoices and customs declarations, practised in class.", Icon: IconFile },
  { title: "Small classes", text: "Every student gets direct attention from lecturers who know the trade.", Icon: IconUsers },
  { title: "On the trade corridor", text: "Chipata sits close to the Mwami border, where clearing agents are always needed.", Icon: IconTruck },
  { title: "Career-ready in one year", text: "Finish ready to work for an agency, a transporter, or start your own.", Icon: IconBriefcase },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id,title,body,posted_on")
    .in("audience", ["public", "website"])
    .order("posted_on", { ascending: false })
    .limit(3);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="anim-l">
            <p className="eyebrow">Practical • Focused • Career-ready</p>
            <h1>Your Career in Trade<br /><span>Starts Here.</span></h1>
            <p className="lede">
              A one-year Diploma in Clearing and Forwarding in Chipata. Learn customs procedure,
              shipping documents and cargo handling, the skills every border post and freight agency needs.
            </p>
            <div className="ctas">
              <Link className="btn btn-navy" href="/admissions">Apply Now</Link>
              <Link className="btn btn-outline" href="/programme">Learn More</Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="stats">
        <div className="wrap">
          <div className="stat"><div className="v">Diploma</div><div className="k">Award</div></div>
          <div className="stat"><div className="v">1 year</div><div className="k">Duration</div></div>
          <div className="stat"><div className="v">7</div><div className="k">Core modules</div></div>
          <div className="stat"><div className="v">Chipata</div><div className="k">Campus</div></div>
        </div>
      </section>

      <section className="sec sec-soft">
        <div className="wrap">
          <SecHead eyebrow="Get started" title="Everything In One Place" sub="Find out about the course, apply, or sign in to your student account." />
          <div className="grid3">
            {START.map(({ href, title, text, more, Icon }) => (
              <Link key={href} href={href} className="fcard">
                <div className="ficon"><Icon size={30} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="more">{more} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <SecHead eyebrow="Why Manchilui" title="Training That Gets You Working" />
          <div className="grid2" style={{ gap: 24 }}>
            {WHY.map(({ title, text, Icon }) => (
              <div key={title} className="fcard static" style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
                <div className="ficon" style={{ marginBottom: 0 }}><Icon size={28} /></div>
                <div><h3 style={{ fontSize: "1.2rem" }}>{title}</h3><p>{text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-soft">
        <div className="wrap" style={{ maxWidth: 860 }}>
          <SecHead eyebrow="Notice board" title="Latest Announcements" />
          <Announcements items={(data ?? []) as Announcement[]} empty="No announcements right now. Check back soon." />
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <div>
            <h2>Ready to start your career in trade?</h2>
            <p>Applications are open for the next intake.</p>
          </div>
          <Link className="btn btn-navy" href="/admissions">See How to Apply</Link>
        </div>
      </section>
    </>
  );
}
