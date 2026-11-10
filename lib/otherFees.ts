import "server-only";

export type FeeItem = { code: string; name: string; kind: "fee" | "item"; amount: number | null; sort: number };
export type StudentFeeRow = { student_id: string; item_code: string; balance: number; provided: boolean };

type SB = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function feeItems(sb: SB): Promise<FeeItem[]> {
  const { data } = await sb.from("fee_items").select("code,name,kind,amount,sort").order("sort");
  return ((data ?? []) as FeeItem[]).map((f) => ({ ...f, amount: f.amount === null ? null : Number(f.amount) }));
}

/** Rows for one student, joined to the item list (missing rows count as fully paid / brought). */
export async function studentFees(sb: SB, studentId: string) {
  const [items, { data }] = await Promise.all([feeItems(sb), sb.from("student_fee_items").select("item_code,balance,provided").eq("student_id", studentId)]);
  const rows = (data ?? []) as { item_code: string; balance: number; provided: boolean }[];
  const lines = items.map((f) => {
    const r = rows.find((x) => x.item_code === f.code);
    const balance = Number(r?.balance ?? 0);
    const amount = Number(f.amount ?? 0);
    return { ...f, balance, paid: Math.max(0, amount - balance), provided: r?.provided ?? true };
  });
  const fees = lines.filter((l) => l.kind === "fee");
  const items_ = lines.filter((l) => l.kind === "item");
  return {
    fees,
    items: items_,
    total: fees.reduce((t, l) => t + Number(l.amount ?? 0), 0),
    paid: fees.reduce((t, l) => t + l.paid, 0),
    balance: fees.reduce((t, l) => t + l.balance, 0),
    missing: items_.filter((i) => !i.provided).length,
  };
}
