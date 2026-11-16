const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function under1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) {
    const t = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? `-${ONES[r % 10]}` : ""}`;
    parts.push(h ? `and ${t}` : t);
  }
  return parts.join(" ");
}

/** 800 -> "Eight Hundred Kwacha Only"; 1250.5 -> "One Thousand Two Hundred and Fifty Kwacha and Fifty Ngwee Only". */
export function kwachaInWords(amount: number) {
  const k = Math.floor(amount);
  const n = Math.round((amount - k) * 100);
  const chunks: string[] = [];
  const m = Math.floor(k / 1_000_000), th = Math.floor((k % 1_000_000) / 1000), rest = k % 1000;
  if (m) chunks.push(`${under1000(m)} Million`);
  if (th) chunks.push(`${under1000(th)} Thousand`);
  if (rest) chunks.push(under1000(rest));
  const kw = chunks.length ? `${chunks.join(" ")} Kwacha` : "Zero Kwacha";
  return `${kw}${n ? ` and ${under1000(n)} Ngwee` : ""} Only`;
}
