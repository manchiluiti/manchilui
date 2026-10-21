"use client";
export default function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return <button className="btn btn-navy btn-sm noprint" onClick={() => window.print()}>{label}</button>;
}
