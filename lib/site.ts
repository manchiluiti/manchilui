export const SITE = {
  name: "Manchilui Training Institute",
  place: "Eastrise · Chipata · Zambia",
  address: "Eastrise, Chipata, Eastern Province, Zambia",
  phone: "+260 973 742 072",
  email: "info@manchilui.com",
  programme: "Diploma in Clearing & Forwarding",
};

export const PAGES: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/programme", label: "The Programme" },
  { href: "/admissions", label: "Admissions" },
  { href: "/management", label: "Management" },
  { href: "/campus", label: "Campus" },
  { href: "/contact", label: "Contact" },
];

/** Students sign in with their student ID. Supabase Auth needs an email,
 *  so each ID maps to a private login address on the school's domain. */
export const STUDENT_EMAIL_DOMAIN = "students.manchilui.com";
export const studentIdToEmail = (id: string) =>
  `${id.trim().toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;

/** Manchilui student IDs are 8 digits: year + intake month + number, e.g. 20260647. The older MTI-2026-001 style is still accepted. */
export const STUDENT_ID_RE = /^(\d{8}|MTI-\d{4}-\d{3})$/;
export const STUDENT_ID_HINT = "8 digits, e.g. 20260647";

/** Suggests the next ID after the highest 8-digit ID for this year. */
export function nextStudentId(existing: string[], year = new Date().getFullYear()) {
  const nums = existing.filter((x) => /^\d{8}$/.test(x) && x.startsWith(String(year))).map(Number);
  return nums.length ? String(Math.max(...nums) + 1) : `${year}0101`;
}
