export default function ManifestCard() {
  return (
      <div className="manifest" role="img" aria-label="Programme summary styled as a shipping document">
      <div className="mf-top"><b>PROGRAMME MANIFEST</b><span className="mf-ref">REF MTI/DCF</span></div>
      <div className="mf-row"><span>Award</span><span>Diploma in Clearing &amp; Forwarding</span></div>
      <div className="mf-row"><span>Duration</span><span>1 year</span></div>
      <div className="mf-row"><span>Origin</span><span>Eastrise, Chipata</span></div>
      <div className="mf-row"><span>Destination</span><span>Border posts, ports, freight agencies</span></div>
      <div className="mf-row"><span>Fees</span><span>Issued with acceptance letter</span></div>
      <div className="mf-foot"><span className="mf-note">Consignee: you</span><span className="stamp">ENROLLING</span></div>
    </div>
  );
}
