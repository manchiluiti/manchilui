"use client";
import { useEffect, useRef, useState } from "react";

/** The issuer's signature (public/signature.png). Shows a blank signature line if the file isn't there. */
export default function SignatureImg() {
  const [ok, setOk] = useState(true);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setOk(false); // failed before React attached onError
  }, []);
  if (!ok) return <span className="sig-blank" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src="/signature.png" alt="Signature of Innocent Phiri" className="sig-img" onError={() => setOk(false)} />;
}
