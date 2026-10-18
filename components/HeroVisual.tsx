import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

// Drop a photo at public/hero.jpg and it replaces the manifest card automatically.
const hasPhoto = fs.existsSync(path.join(process.cwd(), "public", "hero.jpg"));

export default function HeroVisual() {
  if (hasPhoto) {
    return (
      <div className="hero-visual anim-r">
        <Image src="/hero.jpg" alt="Students at Manchilui Training Institute" fill sizes="(max-width: 860px) 100vw, 50vw" priority />
      </div>
    );
  }
  return (
    <div className="hero-visual fallback anim-r">
      <div className="manifest" role="img" aria-label="Programme summary styled as a shipping document">
        <div className="mf-top"><b>PROGRAMME MANIFEST</b><span className="mf-ref">REF MTI/DCF</span></div>
        <div className="mf-row"><span>Award</span><span>Diploma in Clearing &amp; Forwarding</span></div>
        <div className="mf-row"><span>Duration</span><span>6 months</span></div>
        <div className="mf-row"><span>Origin</span><span>Eastrise, Chipata</span></div>
        <div className="mf-row"><span>Destination</span><span>Border posts, ports, freight agencies</span></div>
        <div className="mf-row"><span>Fees</span><span>Issued with acceptance letter</span></div>
        <div className="mf-foot"><span className="mf-note">Consignee: you</span><span className="stamp">ENROLLING</span></div>
      </div>
    </div>
  );
}
