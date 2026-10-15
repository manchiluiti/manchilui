export const SITE = {
  name: "Manchilui Training Institute",
  place: "Eastrise · Chipata · Zambia",
  address: "Eastrise, Chipata, Eastern Province, Zambia",
  directorPhone: "+260 970 615 997",
  email: "manchiluiti@gmail.com",
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
