import "server-only";
import { SITE } from "@/lib/site";

/** Zambian numbers to international format: 0977123456 / 977123456 / +260977123456 -> +260977123456 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("260")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[579]\d{8}$/.test(d) ? `+260${d}` : null;
}

export const smsConfigured = () => !!(process.env.AT_USERNAME && process.env.AT_API_KEY);

const officePhone = SITE.phone.replace(/\s/g, "").replace("+260", "0");
const k = (n: number) => `K${Number(n).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const first = (name: string) => name.trim().split(/\s+/)[0];

export const templates = {
  balanceReminder: (name: string, balance: number) =>
    `Manchilui Training Institute: Dear ${first(name)}, your fees balance is ${k(balance)}. Kindly pay at the office. Enquiries ${officePhone}.`,
  monthlyReminder: (name: string, balance: number, month: string) =>
    `Manchilui: Dear ${first(name)}, this is a reminder that ${month} fees are due. Balance ${k(balance)}. Kindly pay at the office. Tel ${officePhone}.`,
  salaryPaid: (name: string, net: number, month: string, method: string) =>
    `Manchilui Training Institute: Dear ${first(name)}, your ${month} salary of ${k(net)} has been paid via ${method}. Your payslip is in the staff portal.`,
};

export type SmsResult = { ok: boolean; detail: string; cost?: string };

/** Sends one SMS through Africa's Talking. Never throws. */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return { ok: false, detail: "SMS is not set up (AT_USERNAME / AT_API_KEY missing in Vercel)." };
  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
  try {
    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: `Africa's Talking error ${res.status}: ${text.slice(0, 200)}` };
    const data = JSON.parse(text);
    const r = data?.SMSMessageData?.Recipients?.[0];
    if (!r) return { ok: false, detail: data?.SMSMessageData?.Message ?? "No recipient in response" };
    const ok = r.statusCode === 100 || r.statusCode === 101 || r.statusCode === 102;
    return { ok, detail: r.status ?? "", cost: r.cost };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Network error" };
  }
}

export const monthLabel = (d: Date | string) =>
  new Date(typeof d === "string" ? d + (d.length === 10 ? "T00:00:00" : "") : d).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Lusaka" });
